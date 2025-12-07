import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProductData {
  title: string | null;
  price: string | null;
  brand: string | null;
  description: string | null;
  images: string[];
  features: string[];
  specifications: Record<string, string | number>;
  availability: string | null;
  rating: number | null;
  review_count: number;
}

interface ScrapeJob {
  id: string;
  user_id: string;
  urls: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  results: Record<string, number>;
  error_log: ErrorLog[];
  created_at: string;
  completed_at: string | null;
}

interface ErrorLog {
  url: string;
  error: string;
  details?: unknown;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

function extractMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta property="${name}" content="([^"]+)"`, 'i'),
    new RegExp(`<meta name="${name}" content="([^"]+)"`, 'i'),
    new RegExp(`<meta itemprop="${name}" content="([^"]+)"`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractText(html: string, selector: string): string | null {
  const regex = new RegExp(`${selector}[^>]*>([^<]+)<`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllMatches(html: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

async function scrapeProduct(url: string): Promise<ProductData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  if (html.includes('captcha') || html.includes('blocked') || html.length < 1000) {
    throw new Error('Site blocked request - CAPTCHA or bot detection triggered');
  }

  const domain = extractDomain(url);

  let data: ProductData = {
    title: null,
    price: null,
    brand: null,
    description: null,
    images: [],
    features: [],
    specifications: {},
    availability: null,
    rating: null,
    review_count: 0,
  };

  data.title = extractMetaContent(html, 'og:title') ||
               extractMetaContent(html, 'twitter:title') ||
               extractText(html, '<h1');
  
  data.description = extractMetaContent(html, 'og:description') ||
                     extractMetaContent(html, 'description');
  
  const ogImage = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'twitter:image');
  if (ogImage) {
    data.images = [ogImage];
  }

  if (domain.includes('amazon')) {
    const productTitle = extractText(html, '<span id="productTitle"');
    if (productTitle) data.title = productTitle;
    
    const priceWhole = extractText(html, '<span class="a-price-whole"');
    const priceFraction = extractText(html, '<span class="a-price-fraction"');
    if (priceWhole) {
      data.price = priceFraction ? `${priceWhole}.${priceFraction}` : priceWhole;
    }
    
    const brandMatch = html.match(/<a id="bylineInfo"[^>]*>([^<]+)</);
    if (brandMatch) data.brand = brandMatch[1].replace('Visit the ', '').replace(' Store', '').trim();
    
    const imageMatches = html.match(/"hiRes":"([^"]+)"/g);
    if (imageMatches && imageMatches.length > 0) {
      data.images = imageMatches.map(m => m.match(/"hiRes":"([^"]+)"/)?.[1] || '').filter(Boolean);
    }
    
    const ratingMatch = html.match(/([0-9.]+) out of 5 stars/);
    if (ratingMatch) {
      data.rating = parseFloat(ratingMatch[1]);
    }
    
    const reviewMatch = html.match(/([0-9,]+) ratings/);
    if (reviewMatch) {
      data.review_count = parseInt(reviewMatch[1].replace(/,/g, ''));
    }

    const availMatch = html.match(/<span class="a-size-medium a-color-success">([^<]+)</);
    if (availMatch) data.availability = availMatch[1].trim();
    
  } else if (domain.includes('ebay')) {
    const titleMatch = html.match(/<h1 class="x-item-title[^"]*">([^<]+)</);
    if (titleMatch) data.title = titleMatch[1].trim();
    
    const priceMatch = html.match(/<div class="x-price-primary[^"]*">\s*<span[^>]*>([^<]+)</);
    if (priceMatch) data.price = priceMatch[1].trim();
    
    const imageMatches = extractAllMatches(html, /<img[^>]+src="([^"]+)"[^>]*alt="Picture/);
    if (imageMatches.length > 0) data.images = imageMatches;
    
  } else if (domain.includes('walmart')) {
    const priceMatch = html.match(/"price":"([^"]+)"/);
    if (priceMatch) {
      data.price = priceMatch[1];
    }
  } else if (domain.includes('academy')) {
    const priceMatch = html.match(/"price":"([^"]+)"/);
    if (priceMatch) {
      data.price = priceMatch[1];
    }

    const imgMatch = html.match(/<img[^>]+class="[^"]*product-image[^"]*"[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      data.images = [imgMatch[1]];
    }
  }

  if (!data.title) {
    const titleTag = extractText(html, '<title');
    if (titleTag) {
      data.title = titleTag.split('|')[0].split('-')[0].trim();
    }
  }

  if (data.images.length === 0) {
    const imgMatches = html.match(/<img[^>]+src="([^"]+)"[^>]*>/gi);
    if (imgMatches) {
      const validImages = imgMatches
        .map(img => {
          const srcMatch = img.match(/src="([^"]+)"/);
          return srcMatch ? srcMatch[1] : null;
        })
        .filter(src => src &&
          (src.includes('http') || src.startsWith('//')) &&
          !src.includes('icon') &&
          !src.includes('logo') &&
          !src.includes('pixel') &&
          !src.includes('1x1')
        );

      if (validImages.length > 0) {
        data.images = validImages.slice(0, 5);
      }
    }
  }

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { data: jobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = jobs[0] as ScrapeJob;

    await supabase
      .from('scrape_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    const errors: ErrorLog[] = [];
    let successCount = 0;
    const BATCH_SIZE = 3;

    const processBatch = async (urls: string[], startIndex: number) => {
      const promises = urls.map(async (url) => {
        try {
          const productData = await scrapeProduct(url);
          const domain = extractDomain(url);

          if (!productData.title) {
            throw new Error('Could not extract product title');
          }

          const { error: insertError } = await supabase
            .from('products')
            .insert({
              user_id: user.id,
              source_url: url,
              domain,
              title: productData.title,
              price: productData.price,
              brand: productData.brand,
              description: productData.description,
              images: productData.images,
              features: productData.features,
              specifications: productData.specifications,
              availability: productData.availability,
              rating: productData.rating,
              review_count: productData.review_count,
              scrape_method: 'bulk',
              raw_data: productData,
            });

          if (insertError) {
            errors.push({ url, error: insertError.message, details: insertError });
            return { success: false, url };
          }

          successCount++;
          return { success: true, url };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ url, error: errorMessage });
          return { success: false, url };
        }
      });

      await Promise.all(promises);

      await supabase
        .from('scrape_jobs')
        .update({ progress: startIndex + urls.length })
        .eq('id', job.id);
    };

    for (let i = 0; i < job.urls.length; i += BATCH_SIZE) {
      const batch = job.urls.slice(i, Math.min(i + BATCH_SIZE, job.urls.length));
      await processBatch(batch, i);
    }

    const finalStatus = errors.length === job.urls.length ? 'failed' : 'completed';
    
    await supabase
      .from('scrape_jobs')
      .update({
        status: finalStatus,
        progress: job.urls.length,
        completed_at: new Date().toISOString(),
        error_log: errors,
        results: { success: successCount, failed: errors.length },
      })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: finalStatus,
        results: { success: successCount, failed: errors.length },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ error: errorMessage, stack: errorStack }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
