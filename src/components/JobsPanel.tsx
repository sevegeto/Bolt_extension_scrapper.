import { useState } from 'react';
import { ScrapeJob, supabase } from '../lib/supabase';
import { runScrapeJobs } from '../lib/jobs';
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw, Play, Trash2, RotateCcw } from 'lucide-react';

type Props = {
  jobs: ScrapeJob[];
  onRefresh: () => void;
};

export default function JobsPanel({ jobs, onRefresh }: Props) {
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    setDeleting(jobId);
    try {
      const { error } = await supabase.from('scrape_jobs').delete().eq('id', jobId);

      if (error) throw error;

      onRefresh();
    } catch (error: any) {
      console.error('Failed to delete job:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleProcessJob = async (jobId?: string) => {
    setProcessing(true);
    try {
      await runScrapeJobs({
        jobId,
        onProgress: () => onRefresh(),
      });
      onRefresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to process job';
      alert(message);
      onRefresh();
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryFailed = async (job: ScrapeJob) => {
    const failedUrls = (job.error_log || [])
      .map((entry) => (entry && typeof entry === 'object' ? entry.url : ''))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);

    if (failedUrls.length === 0) {
      alert('This job has no failed URLs to retry.');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error } = await supabase.from('scrape_jobs').insert({
        user_id: user.id,
        urls: failedUrls,
        status: 'pending',
        progress: 0,
        total: failedUrls.length,
      }).select('id').single();

      if (error) throw error;
      await runScrapeJobs({ jobId: created.id, onProgress: () => onRefresh() });
      onRefresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to retry';
      alert(message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: ScrapeJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-slate-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: ScrapeJob['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-slate-100 text-slate-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Loader2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No scraping jobs yet</h3>
        <p className="text-slate-600">
          Use the Bulk Import feature to create your first scraping job
        </p>
      </div>
    );
  }

  const resumableJob = jobs.find((job) => job.status === 'pending' || job.status === 'processing');

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {resumableJob && (
          <button
            onClick={() => handleProcessJob(resumableJob.id)}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {resumableJob.status === 'processing' ? 'Resume Job' : 'Process Next Job'}
              </>
            )}
          </button>
        )}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(job.status)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">
                      Bulk Scraping Job
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Created {new Date(job.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteJob(job.id)}
                disabled={deleting === job.id || job.status === 'processing'}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete job"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium text-slate-900">
                    {job.progress} / {job.total} URLs
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      job.status === 'completed'
                        ? 'bg-green-500'
                        : job.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${job.total ? Math.min(100, (job.progress / job.total) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {job.completed_at && (
                <p className="text-sm text-slate-600">
                  Completed {new Date(job.completed_at).toLocaleString()}
                </p>
              )}

              {job.results && typeof job.results === 'object' && 'success' in job.results && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Success:</span>
                    <span className="font-medium text-green-600">{job.results.success || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Failed:</span>
                    <span className="font-medium text-red-600">{job.results.failed || 0}</span>
                  </div>
                </div>
              )}

              {job.error_log && job.error_log.length > 0 && (
                <button
                  onClick={() => handleRetryFailed(job)}
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry failed URLs
                </button>
              )}

              {job.error_log && job.error_log.length > 0 && (
                <details className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <summary className="text-sm font-medium text-red-900 cursor-pointer">
                    View Errors ({job.error_log.length})
                  </summary>
                  <div className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto mt-2">
                    {job.error_log.map((err: any, idx: number) => (
                      <div key={idx} className="border-t border-red-200 pt-1 mt-1">
                        <div className="font-medium">{err.url || 'Unknown URL'}</div>
                        <div>{err.error || JSON.stringify(err)}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
