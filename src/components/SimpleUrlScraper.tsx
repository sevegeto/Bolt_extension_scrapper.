import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SimpleUrlScraper() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setResult({ success: false, message: 'Please enter a URL' });
      return;
    }

    try {
      new URL(url);
    } catch {
      setResult({ success: false, message: 'Please enter a valid URL' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-url`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape URL');
      }

      setResult({
        success: true,
        message: `Successfully scraped: ${data.product.title || 'Product'}`
      });
      setUrl('');
    } catch (error) {
      console.error('Scraping error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to scrape URL'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Simple URL Scraper</h3>
            <p className="text-sm text-slate-600">
              Paste any product URL to extract data automatically
            </p>
          </div>
        </div>

        <form onSubmit={handleScrape} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
              Product URL
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/product-page"
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Works best with simple product pages. For complex sites like Amazon, use the Chrome extension.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                Scrape Product
              </>
            )}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`font-medium ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.success ? 'Success!' : 'Error'}
              </p>
              <p
                className={`text-sm mt-1 ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.message}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">Tips for best results:</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Use this for simple e-commerce sites with standard product pages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>For Amazon, eBay, and complex sites, use the Chrome extension instead</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>The scraper automatically extracts title, price, images, and description</span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Apify Integration (Optional)
          </h4>
          <p className="text-sm text-amber-800 mb-3">
            The scraper works great without Apify! For enhanced performance with JavaScript-heavy sites, you can optionally add an Apify API token. See <strong>APIFY-SETUP.md</strong> for details.
          </p>
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> If you see "Apify scraping failed" errors, don't worry - the scraper automatically falls back to basic mode and continues working.
          </p>
        </div>
      </div>
    </div>
  );
}
