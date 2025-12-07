import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

type Props = {
  onJobCreated: () => void;
};

export default function BulkImport({ onJobCreated }: Props) {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    const validUrls = urlList.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      setError('No valid URLs found. Please check your input.');
      return;
    }

    if (validUrls.length !== urlList.length) {
      setError(`Found ${urlList.length - validUrls.length} invalid URL(s). Only ${validUrls.length} valid URLs will be processed.`);
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error: insertError } = await supabase.from('scrape_jobs').insert({
        user_id: user.id,
        urls: validUrls,
        status: 'pending',
        progress: 0,
        total: validUrls.length,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setUrls('');

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scrape-jobs`;

        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => {
          console.error('Failed to start processing:', err);
        });
      }

      setTimeout(() => {
        onJobCreated();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create scraping job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Paste Product URLs
          </h3>
          <p className="text-slate-600">
            Enter one URL per line. Supported sites include Amazon, eBay, Walmart, and more.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                Scraping job created and processing started! Redirecting to jobs panel...
              </p>
            </div>
          )}

          <div>
            <label htmlFor="urls" className="block text-sm font-medium text-slate-700 mb-2">
              Product URLs
            </label>
            <textarea
              id="urls"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://www.amazon.com/dp/B08N5WRWNW&#10;https://www.ebay.com/itm/123456789&#10;https://www.walmart.com/ip/123456789"
              rows={12}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-mono text-sm"
            />
            <p className="mt-2 text-sm text-slate-500">
              {urls.split('\n').filter(u => u.trim()).length} URLs entered
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-2 text-sm">How it works:</h4>
            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
              <li>Paste product URLs (one per line)</li>
              <li>Click "Start Bulk Scraping"</li>
              <li>Monitor progress in the Jobs tab</li>
              <li>View scraped products in the Products tab</li>
            </ol>
          </div>

          <button
            type="submit"
            disabled={loading || !urls.trim()}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Job...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Start Bulk Scraping
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
