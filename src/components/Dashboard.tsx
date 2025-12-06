import { useState, useEffect } from 'react';
import { supabase, Product, ScrapeJob } from '../lib/supabase';
import { LogOut, Plus, Grid, List, Download, Loader2, ChevronDown } from 'lucide-react';
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
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const handleExport = (format: 'full' | 'mercadolibre' = 'full') => {
    let csv: string;

    if (format === 'mercadolibre') {
      csv = [
        ['Title', 'Price', 'Currency', 'Condition', 'Available_Quantity', 'Description', 'Brand', 'Image_1', 'Image_2', 'Image_3', 'Image_4', 'Image_5', 'Features', 'Source_URL'].join(','),
        ...products.map(p => {
          const images = p.images || [];
          const features = (p.features || []).join('; ');
          const condition = 'new';
          const quantity = 1;

          return [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            p.price || '',
            p.currency || 'USD',
            condition,
            quantity,
            `"${(p.description || '').replace(/"/g, '""')}"`,
            `"${(p.brand || '').replace(/"/g, '""')}"`,
            images[0] || '',
            images[1] || '',
            images[2] || '',
            images[3] || '',
            images[4] || '',
            `"${features.replace(/"/g, '""')}"`,
            p.source_url
          ].join(',');
        })
      ].join('\n');
    } else {
      csv = [
        ['Title', 'Brand', 'Price', 'Currency', 'Description', 'Images', 'Features', 'Specifications', 'Availability', 'Rating', 'Reviews', 'Domain', 'Source_URL', 'Scraped_At'].join(','),
        ...products.map(p => {
          const images = (p.images || []).join('|');
          const features = (p.features || []).join('|');
          const specs = JSON.stringify(p.specifications || {}).replace(/"/g, '""');

          return [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.brand || '').replace(/"/g, '""')}"`,
            p.price || '',
            p.currency || 'USD',
            `"${(p.description || '').replace(/"/g, '""')}"`,
            `"${images}"`,
            `"${features}"`,
            `"${specs}"`,
            `"${(p.availability || '').replace(/"/g, '""')}"`,
            p.rating || '',
            p.review_count || 0,
            p.domain || '',
            p.source_url,
            new Date(p.created_at).toLocaleString()
          ].join(',');
        })
      ].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const formatSuffix = format === 'mercadolibre' ? '-mercadolibre' : '-full';
    a.download = `products${formatSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
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
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
                    <button
                      onClick={() => {
                        handleExport('full');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="font-medium text-slate-900">Full Export</div>
                      <div className="text-xs text-slate-500">All data including images, features, specs</div>
                    </button>
                    <button
                      onClick={() => {
                        handleExport('mercadolibre');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="font-medium text-slate-900">MercadoLibre Format</div>
                      <div className="text-xs text-slate-500">Optimized for marketplace import</div>
                    </button>
                  </div>
                )}
              </div>
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
