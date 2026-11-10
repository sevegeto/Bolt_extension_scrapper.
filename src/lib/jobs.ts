import { supabase } from './supabase';

export type JobProgress = {
  jobId?: string;
  status?: string;
  continue?: boolean;
  busy?: boolean;
  progress?: number;
  total?: number;
  updatedAt?: string;
  results?: { success?: number; failed?: number };
  error?: string;
  message?: string;
};

const MAX_STEPS = 200;

export async function runScrapeJobs(options?: {
  jobId?: string;
  onProgress?: (progress: JobProgress) => void;
}): Promise<JobProgress> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  let jobId = options?.jobId;
  let updatedAt = '';

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scrape-jobs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, updatedAt: updatedAt || undefined }),
      },
    );

    const data = await response.json() as JobProgress;
    if (!response.ok) throw new Error(data.error || 'Failed to process the scraping job');

    options?.onProgress?.(data);
    if (data.jobId) jobId = data.jobId;

    if (data.busy) {
      if (!jobId) return data;
      const { data: job } = await supabase
        .from('scrape_jobs')
        .select('updated_at, status')
        .eq('id', jobId)
        .maybeSingle();
      if (!job || job.status === 'completed' || job.status === 'failed') {
        return { ...data, status: job?.status, continue: false, busy: false };
      }
      updatedAt = job.updated_at || '';
      await delay(800);
      continue;
    }

    if (!data.continue) return data;
    updatedAt = data.updatedAt || '';
  }

  throw new Error('Scraping paused before the job finished. Resume it from the Jobs tab.');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
