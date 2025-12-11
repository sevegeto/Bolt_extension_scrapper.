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

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const productData = extractProductData(html, url);

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
      features: [],
      specifications: productData.specifications || {},
      availability: productData.availability || null,
      rating: null,
      review_count: 0,
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

function extractProductData(html: string, url: string) {
  const data: any = {
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    brand: '',
    images: [],
    specifications: {},
    availability: '',
  };

  const getMetaContent = (pattern: RegExp): string => {
    const match = html.match(pattern);
    return match && match[1] ? decodeHtml(match[1].trim()) : '';
  };

  data.title = 
    getMetaContent(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i) ||
    getMetaContent(/<title[^>]*>([^<]*)<\/title>/i) ||
    getMetaContent(/<h1[^>]*>([^<]*)<\/h1>/i);

  data.description = 
    getMetaContent(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["']/i) ||
    getMetaContent(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);

  const imageUrl = 
    getMetaContent(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
    getMetaContent(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i);
  
  if (imageUrl) {
    data.images.push(imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, url).href);
  }

  const pricePattern = /<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']*)["']/i;
  const priceMatch = html.match(pricePattern);
  if (priceMatch && priceMatch[1]) {
    data.price = priceMatch[1].trim();
  } else {
    const priceText = 
      getMetaContent(/<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*)<\/span>/i) ||
      getMetaContent(/<div[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*)<\/div>/i);
    
    if (priceText) {
      const numMatch = priceText.match(/[\d,]+\.?\d*/);
      if (numMatch) {
        data.price = numMatch[0].replace(/,/g, '');
      }
    }
  }

  const currencyPattern = /<meta[^>]*property=["']og:price:currency["'][^>]*content=["']([^"']*)["']/i;
  const currencyMatch = html.match(currencyPattern);
  if (currencyMatch && currencyMatch[1]) {
    data.currency = currencyMatch[1].trim();
  }

  data.brand = 
    getMetaContent(/<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']*)["']/i) ||
    getMetaContent(/<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']*)["']/i);

  const availPattern = /<meta[^>]*property=["']og:availability["'][^>]*content=["']([^"']*)["']/i;
  const availMatch = html.match(availPattern);
  if (availMatch && availMatch[1]) {
    data.availability = availMatch[1].trim();
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
    '&nbsp;': ' ',
  };
  
  return html.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
}
