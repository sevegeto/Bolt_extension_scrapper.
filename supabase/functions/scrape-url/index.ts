import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { publicError, scrapeProduct } from "../_shared/extract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) throw new Error("URL is required");

    const productData = await scrapeProduct(url, Deno.env.get("APIFY_API_TOKEN") || undefined);
    if (!productData.title && !productData.price) {
      throw new Error("Could not extract product data. Try the Chrome extension on the open product page.");
    }

    const productRecord = {
      user_id: user.id,
      source_url: url,
      domain: new URL(url).hostname.replace(/^www\./, ""),
      title: productData.title,
      price: productData.price,
      currency: productData.currency || "USD",
      brand: productData.brand,
      description: productData.description,
      images: productData.images,
      features: productData.features,
      specifications: productData.specifications,
      availability: productData.availability,
      rating: productData.rating,
      review_count: productData.review_count,
      scrape_method: "url-scraper",
      raw_data: productData,
    };

    const { data: product, error: insertError } = await supabase
      .from("products")
      .upsert(productRecord, { onConflict: "user_id,source_url" })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return new Response(JSON.stringify({ success: true, product }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: publicError(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
