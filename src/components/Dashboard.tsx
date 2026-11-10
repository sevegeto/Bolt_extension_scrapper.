import { useState, useEffect, useRef } from 'react';
import { supabase, Product, ScrapeJob } from '../lib/supabase';
import { LogOut, Plus, Grid, List, Download, Loader2, ChevronDown, FileSpreadsheet, Globe, AlertCircle } from 'lucide-react';
import ProductGrid from './ProductGrid';
import BulkImport from './BulkImport';
import JobsPanel from './JobsPanel';
import SimpleUrlScraper from './SimpleUrlScraper';
import { toCsv } from '../lib/csv';

type View = 'products' | 'bulk-import' | 'jobs' | 'url-scraper';

export default function Dashboard() {
  const [view, setView] = useState<View>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!showExportMenu) return undefined;

    const closeMenu = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [showExportMenu]);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email || '');
  };

  const loadProducts = async () => {
    const { data, error: loadError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
    } else {
      setProducts((data || []) as Product[]);
      setError('');
    }
    setLoading(false);
  };

  const loadJobs = async () => {
    const { data, error: loadError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (loadError) {
      setError(loadError.message);
    } else {
      setJobs((data || []) as ScrapeJob[]);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleGoogleSheetsExport = () => {
    downloadCsv(generateRows('full'), `products-for-sheets-${new Date().toISOString().split('T')[0]}.csv`);
    alert('A CSV file was downloaded.\n\nIn Google Sheets: File > Import > Upload, then choose that file.\n\nThe Chrome extension can also copy a table from any page and paste it straight into a sheet.');
  };

  const generateRows = (format: 'full' | 'mercadolibre'): unknown[][] => {
    if (format === 'mercadolibre') {
      return [
        ['Title', 'Price', 'Currency', 'Condition', 'Available_Quantity', 'Description', 'Brand', 'Image_1', 'Image_2', 'Image_3', 'Image_4', 'Image_5', 'Features', 'Source_URL'],
        ...products.map((product) => {
          const images = product.images || [];
          const specs = product.specifications || {};
          return [
            product.title || '',
            product.price || '',
            product.currency || 'USD',
            typeof specs.condition === 'string' ? specs.condition : 'new',
            product.availability || 1,
            product.description || '',
            product.brand || '',
            images[0] || '',
            images[1] || '',
            images[2] || '',
            images[3] || '',
            images[4] || '',
            (product.features || []).join('; '),
            product.source_url,
          ];
        }),
      ];
    }

    return [
      ['Title', 'Brand', 'Price', 'Currency', 'Description', 'Image_1', 'Image_2', 'Image_3', 'Image_4', 'Image_5', 'All_Images', 'Features', 'Specifications', 'Availability', 'Rating', 'Reviews', 'Domain', 'Source_URL', 'Scraped_At'],
      ...products.map((product) => {
        const images = product.images || [];
        return [
          product.title || '',
          product.brand || '',
          product.price || '',
          product.currency || 'USD',
          product.description || '',
          images[0] || '',
          images[1] || '',
          images[2] || '',
          images[3] || '',
          images[4] || '',
          images.join('|'),
          (product.features || []).join('|'),
          JSON.stringify(product.specifications || {}),
          product.availability || '',
          product.rating ?? '',
          product.review_count || 0,
          product.domain || '',
          product.source_url,
          new Date(product.created_at).toLocaleString(),
        ];
      }),
    ];
  };

  const downloadCsv = (rows: unknown[][], filename: string) => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'full' | 'mercadolibre' = 'full') => {
    const formatSuffix = format === 'mercadolibre' ? '-mercadolibre' : '-full';
    downloadCsv(generateRows(format), `products${formatSuffix}-${new Date().toISOString().split('T')[0]}.csv`);
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
              {view === 'url-scraper' && 'URL Scraper'}
            </h2>
            <p className="text-slate-600 mt-1">
              {view === 'products' && `${products.length} products scraped`}
              {view === 'bulk-import' && 'Import multiple products at once'}
              {view === 'jobs' && 'Monitor your scraping operations'}
              {view === 'url-scraper' && 'Scrape products from any URL'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
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
              onClick={() => setView('url-scraper')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'url-scraper'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              URL Scraper
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
              <div className="relative" ref={exportMenuRef}>
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
                      <div className="text-xs text-slate-500">All data with image URLs in columns</div>
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
                    <button
                      onClick={() => {
                        handleGoogleSheetsExport();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors border-t border-slate-200"
                    >
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Google Sheets
                      </div>
                      <div className="text-xs text-slate-500">Export for Google Sheets import</div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading && view === 'products' ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {view === 'products' && <ProductGrid products={products} onUpdate={loadProducts} />}
            {view === 'url-scraper' && <SimpleUrlScraper />}
            {view === 'bulk-import' && <BulkImport onJobCreated={() => setView('jobs')} />}
            {view === 'jobs' && <JobsPanel jobs={jobs} onRefresh={loadJobs} />}
          </>
        )}
      </div>
    </div>
  );
}
