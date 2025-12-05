import { useState } from 'react';
import { Product, supabase } from '../lib/supabase';
import { ExternalLink, Trash2, Star, Package, ShoppingCart } from 'lucide-react';

type Props = {
  products: Product[];
  onUpdate: () => void;
};

export default function ProductGrid({ products, onUpdate }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setDeleting(id);
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (!error) {
      onUpdate();
    }
    setDeleting(null);
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No products yet</h3>
        <p className="text-slate-600 mb-6">
          Use the Chrome extension or bulk import to start scraping products
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
        >
          {product.images && product.images[0] ? (
            <div className="aspect-square bg-slate-100 relative overflow-hidden">
              <img
                src={product.images[0]}
                alt={product.title || 'Product'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="aspect-square bg-slate-100 flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-slate-300" />
            </div>
          )}

          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                  {product.title || 'Untitled Product'}
                </h3>
                {product.brand && (
                  <p className="text-sm text-slate-500">{product.brand}</p>
                )}
              </div>
            </div>

            {product.price && (
              <div className="text-2xl font-bold text-slate-900 mb-3">
                {product.currency && product.currency !== 'USD' ? `${product.currency} ` : '$'}
                {product.price}
              </div>
            )}

            {product.rating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-slate-900">{product.rating}</span>
                </div>
                {product.review_count > 0 && (
                  <span className="text-sm text-slate-500">
                    ({product.review_count.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <span className="px-2 py-1 bg-slate-100 rounded">
                {product.domain || 'Unknown'}
              </span>
              <span className="px-2 py-1 bg-slate-100 rounded capitalize">
                {product.scrape_method}
              </span>
            </div>

            <div className="flex gap-2">
              <a
                href={product.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                View Product
              </a>
              <button
                onClick={() => handleDelete(product.id)}
                disabled={deleting === product.id}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
