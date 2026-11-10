import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { publicError, scrapeProduct } from "../_shared/extract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type JobResults = { success?: number; failed?: number };
type JobError = { url?: string; error?: string };

type ScrapeJob = {
  id: string;
  urls: string[];
  status: string;
  progress: number;
  total: number;
  results: JobResults | null;
  error_log: JobError[] | null;
  updated_at: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase environment is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid token");

    const body = await req.json().catch(() => ({}));
    const requestedId = typeof body.jobId === "string" ? body.jobId : "";
    const expectedUpdatedAt = typeof body.updatedAt === "string" ? body.updatedAt : "";

    let job: ScrapeJob | null = null;
    if (requestedId) {
      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("*")
        .eq("id", requestedId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      job = data as ScrapeJob | null;
    } else {
      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw new Error(error.message);
      job = (data?.[0] as ScrapeJob | undefined) ?? null;
    }

    if (!job) return json({ message: "No pending jobs", continue: false });

    if (job.status === "completed" || job.status === "failed" || job.progress >= job.urls.length) {
      const unfinished = (Array.isArray(job.error_log) ? job.error_log : [])
        .filter((entry) => entry?.error === "Scraping did not finish");
      const updatedAtMs = job.updated_at ? new Date(job.updated_at).getTime() : 0;
      const stillRunning = unfinished.length > 0 && Date.now() - updatedAtMs < 120000;
      if (stillRunning && job.status !== "completed" && job.status !== "failed") {
        return json({
          jobId: job.id,
          status: "processing",
          continue: true,
          busy: true,
          progress: job.progress,
          total: job.total,
          updatedAt: job.updated_at,
        });
      }
      const finalized = await finalizeJob(supabase, job);
      return json(finalized);
    }

    const index = job.progress || 0;
    const stamp = expectedUpdatedAt || job.updated_at;
    const url = job.urls[index];
    const seededErrors = [
      ...(Array.isArray(job.error_log) ? job.error_log : []),
      { url, error: "Scraping did not finish" },
    ];
    let claim = supabase
      .from("scrape_jobs")
      .update({ status: "processing", progress: index + 1, error_log: seededErrors })
      .eq("id", job.id)
      .eq("user_id", user.id)
      .eq("progress", index);
    claim = stamp ? claim.eq("updated_at", stamp) : claim.is("updated_at", null);

    const { data: claimed, error: claimError } = await claim.select("id").maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) {
      return json({
        jobId: job.id,
        status: "processing",
        continue: true,
        busy: true,
        progress: job.progress,
        total: job.total,
      });
    }

    let outcome: JobError | null = null;
    let savedProduct = false;
    try {
      const productData = await scrapeProduct(url, Deno.env.get("APIFY_API_TOKEN") || undefined);
      if (!productData.title) throw new Error("Could not extract a product title");

      const { error: saveError } = await supabase.from("products").upsert({
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
        scrape_method: "bulk",
        raw_data: productData,
      }, { onConflict: "user_id,source_url" });

      if (saveError) outcome = { url, error: saveError.message };
      else savedProduct = true;
    } catch (error) {
      outcome = { url, error: publicError(error) };
    }

    const saved = await recordOutcome(supabase, job.id, url, savedProduct, outcome);
    return json(saved);
  } catch (error) {
    return json({ error: publicError(error) }, 400);
  }
});

async function recordOutcome(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  url: string,
  savedProduct: boolean,
  outcome: JobError | null,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("urls, progress, total, results, error_log, updated_at")
      .eq("id", jobId)
      .single();
    if (error || !data) throw new Error(error?.message || "Job disappeared");

    const job = data as ScrapeJob;
    const results = {
      success: (job.results?.success || 0) + (savedProduct ? 1 : 0),
      failed: (job.results?.failed || 0) + (savedProduct ? 0 : 1),
    };
    const errors = (Array.isArray(job.error_log) ? job.error_log : [])
      .filter((entry) => !(entry?.url === url && entry?.error === "Scraping did not finish"));
    if (outcome) errors.push(outcome);

    const done = job.progress >= job.urls.length;
    const status = done
      ? (results.success === 0 && results.failed > 0 ? "failed" : "completed")
      : "processing";

    let update = supabase
      .from("scrape_jobs")
      .update({
        status,
        results,
        error_log: errors,
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", jobId);
    update = job.updated_at ? update.eq("updated_at", job.updated_at) : update.is("updated_at", null);

    const { data: written, error: writeError } = await update.select("updated_at, progress, total, status, results").maybeSingle();
    if (writeError) throw new Error(writeError.message);
    if (!written) continue;

    return {
      jobId,
      status: written.status,
      continue: written.status === "processing",
      busy: false,
      progress: written.progress,
      total: written.total,
      updatedAt: written.updated_at,
      results: written.results,
    };
  }

  throw new Error("Could not save job progress. Resume the job from the Jobs tab.");
}

async function finalizeJob(supabase: ReturnType<typeof createClient>, job: ScrapeJob) {
  const log = Array.isArray(job.error_log) ? job.error_log : [];
  const unfinished = log.filter((entry) => entry?.error === "Scraping did not finish");
  const errorLog = log.map((entry) => (
    entry?.error === "Scraping did not finish"
      ? { url: entry.url, error: "Scraping stopped before a result was saved" }
      : entry
  ));
  const results = {
    success: job.results?.success || 0,
    failed: (job.results?.failed || 0) + unfinished.length,
  };
  const status = job.status === "pending" || job.status === "processing"
    ? (results.success === 0 && results.failed > 0 ? "failed" : "completed")
    : job.status;

  if (status !== job.status || unfinished.length > 0) {
    const patch: Record<string, unknown> = {
      status,
      results,
      error_log: errorLog,
      progress: job.urls.length,
    };
    if (job.status !== "completed" && job.status !== "failed") {
      patch.completed_at = new Date().toISOString();
    }
    await supabase.from("scrape_jobs").update(patch).eq("id", job.id);
  }

  return {
    jobId: job.id,
    status,
    continue: false,
    progress: job.urls.length,
    total: job.total,
    results,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
