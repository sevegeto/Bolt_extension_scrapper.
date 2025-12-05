import { useState, useEffect } from 'react';
import { supabase, Product, ScrapeJob } from '../lib/supabase';
import { LogOut, Plus, Grid, List, Download, Loader2 } from 'lucide-react';
import ProductGrid from './ProductGrid';
import BulkImport from './BulkImport';
import JobsPanel from './JobsPanel';

type View = 'products' | 'bulk-import' | 'jobs';

export default function Dashboard() {
  const [view, setView] = useState<View>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadUserData();
    loadProducts();
    loadJobs();

    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts();
      })
      .subscribe();

    const jobsChannel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scrape_jobs' }, () => {
        loadJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email || '');
  };

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setJobs(data as ScrapeJob[]);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleExport = () => {
    const csv = [
      ['Title', 'Brand', 'Price', 'Currency', 'URL', 'Domain', 'Rating', 'Reviews', 'Availability', 'Scraped At'].join(','),
      ...products.map(p => [
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        p.price || '',
        p.currency,
        p.source_url,
        p.domain || '',
        p.rating || '',
        p.review_count || 0,
        p.availability || '',
        new Date(p.created_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <Grid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Product Scraper</h1>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {view === 'products' && 'Your Products'}
              {view === 'bulk-import' && 'Bulk Import'}
              {view === 'jobs' && 'Scraping Jobs'}
            </h2>
            <p className="text-slate-600 mt-1">
              {view === 'products' && `${products.length} products scraped`}
              {view === 'bulk-import' && 'Import multiple products at once'}
              {view === 'jobs' && 'Monitor your scraping operations'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('products')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'products'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              Products
            </button>
            <button
              onClick={() => setView('bulk-import')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'bulk-import'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Bulk Import
            </button>
            <button
              onClick={() => setView('jobs')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'jobs'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Loader2 className="w-4 h-4 inline mr-2" />
              Jobs
            </button>
            {view === 'products' && products.length > 0 && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {loading && view === 'products' ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {view === 'products' && <ProductGrid products={products} onUpdate={loadProducts} />}
            {view === 'bulk-import' && <BulkImport onJobCreated={() => setView('jobs')} />}
            {view === 'jobs' && <JobsPanel jobs={jobs} onRefresh={loadJobs} />}
          </>
        )}
      </div>
    </div>
  );
}
