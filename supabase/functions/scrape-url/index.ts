import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { url } = await req.json();

    if (!url) {
      throw new Error("URL is required");
    }

    let productData;
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");

    if (apifyToken) {
      try {
        console.log('Attempting to use Apify API for scraping');
        productData = await scrapeWithApify(url, apifyToken);
      } catch (apifyError) {
        console.error('Apify scraping failed, falling back to basic scraper:', apifyError);
        productData = await scrapeWithFallback(url);
      }
    } else {
      console.log('Using basic scraper (Apify not configured)');
      productData = await scrapeWithFallback(url);
    }

    if (!productData.title && !productData.price) {
      throw new Error('Could not extract product data. The page may not be a product page, or it may require JavaScript rendering. Try using the Chrome extension for better results.');
    }

    const productRecord = {
      user_id: user.id,
      source_url: url,
      domain: new URL(url).hostname.replace('www.', ''),
      title: productData.title || null,
      price: productData.price || null,
      currency: productData.currency || 'USD',
      brand: productData.brand || null,
      description: productData.description || null,
      images: productData.images || [],
      features: productData.features || [],
      specifications: productData.specifications || {},
      availability: productData.availability || null,
      rating: productData.rating || null,
      review_count: productData.review_count || 0,
      scrape_method: 'url-scraper',
      raw_data: productData,
    };

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert(productRecord)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, product }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function scrapeWithApify(url: string, token: string) {
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
    throw new Error(`Apify API returned ${response.status}: ${errorText}`);
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

async function scrapeWithFallback(url: string) {
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
  return extractProductDataFromHtml(html, url);
}

function extractProductDataFromHtml(html: string, url: string) {
  const data: any = {
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    brand: '',
    images: [],
    features: [],
    specifications: {},
    availability: '',
    rating: null,
    review_count: 0,
  };

  const getMetaContent = (pattern: RegExp): string => {
    const match = html.match(pattern);
    return match && match[1] ? decodeHtml(match[1].trim()) : '';
  };

  const getAllMatches = (pattern: RegExp): string[] => {
    const matches: string[] = [];
    let match;
    const regex = new RegExp(pattern.source, pattern.flags + 'g');
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) matches.push(match[1]);
    }
    return matches;
  };

  data.title = 
    getMetaContent(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*itemprop=["']name["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<h1[^>]*class=["'][^"']*product[^"']*[^>]*>([^<]*)<\/h1>/i) ||
    getMetaContent(/<h1[^>]*>([^<]*)<\/h1>/i) ||
    getMetaContent(/<title[^>]*>([^<]*)<\/title>/i);

  data.description = 
    getMetaContent(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*itemprop=["']description["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]*)<\/div>/i);

  const ogImage = getMetaContent(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["\']/i);
  const twitterImage = getMetaContent(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["\']/i);
  const itemPropImage = getMetaContent(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']*)["\']/i);
  
  [ogImage, twitterImage, itemPropImage].forEach(img => {
    if (img && !data.images.includes(img)) {
      const fullUrl = img.startsWith('http') ? img : new URL(img, url).href;
      data.images.push(fullUrl);
    }
  });

  const imgMatches = getAllMatches(/<img[^>]*src=["']([^"']*)["\']/i);
  imgMatches.slice(0, 5).forEach(img => {
    if (img && !data.images.includes(img) && (img.includes('http') || img.startsWith('//'))) {
      try {
        const fullUrl = img.startsWith('http') ? img : (img.startsWith('//') ? 'https:' + img : new URL(img, url).href);
        if (!fullUrl.includes('icon') && !fullUrl.includes('logo') && !fullUrl.includes('pixel') && !fullUrl.includes('1x1')) {
          data.images.push(fullUrl);
        }
      } catch (e) {
        console.error('Error processing image URL:', img, e);
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

  if (!data.currency || data.currency === 'USD') {
    const currencySymbols: Record<string, string> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR',
    };
    
    for (const [symbol, code] of Object.entries(currencySymbols)) {
      if (html.includes(symbol)) {
        data.currency = code;
        break;
      }
    }
  }

  data.brand = 
    getMetaContent(/<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<meta[^>]*itemprop=["']brand["'][^>]*content=["']([^"']*)["\']/i) ||
    getMetaContent(/<span[^>]*class=["'][^"']*brand[^"']*["'][^>]*>([^<]*)<\/span>/i);

  const availPatterns = [
    /<meta[^>]*property=["']og:availability["'][^>]*content=["']([^"']*)["\']/i,
    /<meta[^>]*property=["']product:availability["'][^>]*content=["']([^"']*)["\']/i,
    /<link[^>]*itemprop=["']availability["'][^>]*href=["']https?:\/\/schema\.org\/([^"']*)["\']/i,
  ];

  for (const pattern of availPatterns) {
    const availMatch = html.match(pattern);
    if (availMatch && availMatch[1]) {
      data.availability = availMatch[1];
      break;
    }
  }

  const ratingMatch = html.match(/<meta[^>]*itemprop=["']ratingValue["'][^>]*content=["']([\d.]+)["\']/i);
  if (ratingMatch && ratingMatch[1]) {
    data.rating = parseFloat(ratingMatch[1]);
  }

  const reviewMatch = html.match(/<meta[^>]*itemprop=["']reviewCount["'][^>]*content=["']([\d]+)["\']/i);
  if (reviewMatch && reviewMatch[1]) {
    data.review_count = parseInt(reviewMatch[1]);
  }

  const skuMatch = html.match(/<meta[^>]*itemprop=["']sku["'][^>]*content=["']([^"']*)["\']/i);
  if (skuMatch && skuMatch[1]) {
    data.specifications.sku = skuMatch[1];
  }

  return data;
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
