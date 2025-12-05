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
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = await response.text();
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

  if (domain.includes('amazon')) {
    data.title = extractText(html, '<span id="productTitle"') || 
                 extractText(html, '<h1');
    
    const priceWhole = extractText(html, '<span class="a-price-whole"');
    const priceFraction = extractText(html, '<span class="a-price-fraction"');
    data.price = priceWhole && priceFraction ? `${priceWhole}.${priceFraction}` : priceWhole;
    
    data.brand = extractText(html, '<a id="bylineInfo"');
    
    const imageMatches = html.match(/"hiRes":"([^"]+)"/g);
    if (imageMatches) {
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
  } else if (domain.includes('ebay')) {
    data.title = extractText(html, '<h1 class="x-item-title');
    data.price = extractText(html, '<div class="x-price-primary');
    
    const imageMatches = extractAllMatches(html, /<img[^>]+src="([^"]+)"[^>]*alt="Picture/);
    data.images = imageMatches;
  } else if (domain.includes('walmart')) {
    data.title = extractText(html, '<h1');
    
    const priceMatch = html.match(/"price":"([^"]+)"/);
    if (priceMatch) {
      data.price = priceMatch[1];
    }
  } else {
    data.title = extractText(html, '<h1') || 
                 extractText(html, '<title');
    
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImage) {
      data.images = [ogImage[1]];
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
        const productData = await scrapeProduct(url);
        const domain = extractDomain(url);

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
          errors.push({ url, error: insertError.message });
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
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
