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
  specifications: Record<string, any>;
  availability: string | null;
  rating: number | null;
  review_count: number;
  currency?: string;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

function decodeHtml(html: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
  };
  
  return html.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

async function scrapeWithApify(url: string, token: string): Promise<ProductData> {
  const input = {
    startUrls: [{ url }],
    crawlerType: 'cheerio',
    maxCrawlDepth: 0,
    maxCrawlPages: 1,
  };

  const response = await fetch(
    'https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=' + token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Apify API error:', errorText);
    throw new Error(`Apify API returned ${response.status}`);
  }

  const results = await response.json();
  
  if (!results || !Array.isArray(results) || results.length === 0) {
    throw new Error('No data returned from Apify');
  }

  const pageData = results[0];
  const html = pageData.html || pageData.text || '';
  
  if (!html) {
    throw new Error('Apify returned empty HTML');
  }
  
  return extractProductDataFromHtml(html, url);
}

async function scrapeWithFallback(url: string): Promise<ProductData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  
  if (html.includes('captcha') || html.includes('blocked') || html.length < 1000) {
    throw new Error('Site blocked request - CAPTCHA or bot detection triggered');
  }
  
  return extractProductDataFromHtml(html, url);
}

function extractProductDataFromHtml(html: string, url: string): ProductData {
  const data: ProductData = {
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
    currency: 'USD',
  };

  const getMetaContent = (pattern: RegExp): string | null => {
    const match = html.match(pattern);
    return match && match[1] ? decodeHtml(match[1].trim()) : null;
  };

  const getAllMatches = (pattern: RegExp): string[] => {
    const matches: string[] = [];
    let match;
    const regex = new RegExp(pattern.source, 'g');
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) matches.push(match[1]);
    }
    return matches;
  };

  data.title = 
    getMetaContent(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*itemprop=["']name["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<h1[^>]*>([^<]*)<\/h1>/i) ||
    getMetaContent(/<title[^>]*>([^<]*)<\/title>/i);

  data.description = 
    getMetaContent(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["\']/i);

  const ogImage = getMetaContent(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["\']/i);
  const twitterImage = getMetaContent(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["\']/i);
  
  [ogImage, twitterImage].forEach(img => {
    if (img && !data.images.includes(img)) {
      try {
        const fullUrl = img.startsWith('http') ? img : new URL(img, url).href;
        data.images.push(fullUrl);
      } catch (e) {
        console.error('Error processing image URL:', img);
      }
    }
  });

  const imgMatches = getAllMatches(/<img[^>]*src=["']([^"']*)["\']/i);
  imgMatches.slice(0, 5).forEach(img => {
    if (img && !data.images.includes(img) && (img.includes('http') || img.startsWith('//'))) {
      try {
        const fullUrl = img.startsWith('http') ? img : (img.startsWith('//') ? 'https:' + img : new URL(img, url).href);
        if (!fullUrl.includes('icon') && !fullUrl.includes('logo') && !fullUrl.includes('pixel')) {
          data.images.push(fullUrl);
        }
      } catch (e) {
        console.error('Error processing image URL:', img);
      }
    }
  });

  const pricePatterns = [
    /<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([\d.,]+)["\']/i,
    /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([\d.,]+)["\']/i,
    /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>\s*[$€£¥₹]?\s*([\d.,]+)/i,
    /<div[^>]*class=["'][^"']*price[^"']*["'][^>]*>\s*[$€£¥₹]?\s*([\d.,]+)/i,
    /<span[^>]*itemprop=["']price["'][^>]*content=["']([\d.,]+)["\']/i,
    /["']price["']\s*:\s*["']([\d.,]+)["\']/i,
  ];

  for (const pattern of pricePatterns) {
    const priceMatch = html.match(pattern);
    if (priceMatch && priceMatch[1]) {
      data.price = priceMatch[1].replace(/,/g, '');
      break;
    }
  }

  const currencyPatterns = [
    /<meta[^>]*property=["']og:price:currency["'][^>]*content=["']([A-Z]{3})["\']/i,
    /<meta[^>]*property=["']product:price:currency["'][^>]*content=["']([A-Z]{3})["\']/i,
  ];

  for (const pattern of currencyPatterns) {
    const currMatch = html.match(pattern);
    if (currMatch && currMatch[1]) {
      data.currency = currMatch[1];
      break;
    }
  }

  data.brand = 
    getMetaContent(/<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*itemprop=["']brand["'][^>]*content=["']([^"']*)["\']/i);

  const ratingMatch = html.match(/<meta[^>]*itemprop=["']ratingValue["'][^>]*content=["']([\d.]+)["\']/i);
  if (ratingMatch && ratingMatch[1]) {
    data.rating = parseFloat(ratingMatch[1]);
  }

  const reviewMatch = html.match(/<meta[^>]*itemprop=["']reviewCount["'][^>]*content=["']([\d]+)["\']/i);
  if (reviewMatch && reviewMatch[1]) {
    data.review_count = parseInt(reviewMatch[1]);
  }

  return data;
}

async function scrapeProduct(url: string, apifyToken?: string): Promise<ProductData> {
  if (apifyToken) {
    try {
      console.log('Using Apify for:', url);
      return await scrapeWithApify(url, apifyToken);
    } catch (apifyError) {
      console.error('Apify failed, using fallback:', apifyError);
      return await scrapeWithFallback(url);
    }
  } else {
    console.log('Using fallback scraper for:', url);
    return await scrapeWithFallback(url);
  }
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

    const apifyToken = Deno.env.get('APIFY_API_TOKEN');

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

    const job = jobs[0];

    await supabase
      .from('scrape_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    const errors: any[] = [];
    let successCount = 0;

    for (let i = 0; i < job.urls.length; i++) {
      const url = job.urls[i];
      
      try {
        const productData = await scrapeProduct(url, apifyToken);
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
            currency: productData.currency || 'USD',
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
        } else {
          successCount++;
        }
      } catch (error: any) {
        errors.push({ url, error: error.message });
      }

      await supabase
        .from('scrape_jobs')
        .update({ progress: i + 1 })
        .eq('id', job.id);
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
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
