import { useState } from 'react';
import { ScrapeJob, supabase } from '../lib/supabase';
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw, Play } from 'lucide-react';

type Props = {
  jobs: ScrapeJob[];
  onRefresh: () => void;
};

export default function JobsPanel({ jobs, onRefresh }: Props) {
  const [processing, setProcessing] = useState(false);

  const handleProcessJob = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scrape-jobs`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        onRefresh();
      } else {
        console.error('Job processing error:', result);
        alert(`Error: ${result.error || 'Failed to process job'}`);
      }
    } catch (error: any) {
      console.error('Failed to process job:', error);
      alert(`Error: ${error.message}`);
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

  const hasPendingJobs = jobs.some(job => job.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {hasPendingJobs && (
          <button
            onClick={handleProcessJob}
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
                Process Next Job
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
              <div className="flex items-start gap-3">
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
                    style={{ width: `${(job.progress / job.total) * 100}%` }}
                  />
                </div>
              </div>

              {job.completed_at && (
                <p className="text-sm text-slate-600">
                  Completed {new Date(job.completed_at).toLocaleString()}
                </p>
              )}

              {job.error_log && job.error_log.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Errors ({job.error_log.length})
                  </p>
                  <div className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {job.error_log.slice(0, 5).map((err: any, idx: number) => (
                      <div key={idx}>{typeof err === 'string' ? err : JSON.stringify(err)}</div>
                    ))}
                    {job.error_log.length > 5 && (
                      <div className="font-medium">... and {job.error_log.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
