"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, Loader2, Package } from 'lucide-react';

interface ProductSummary {
  id: string;
  name: string;
  shipping_cost: string;
  is_published: boolean;
  variant_count: string; // Changed to string to match API response
  total_stock: string;   // Changed to string to match API response
  created_at: string;
}

export default function ProductTable({ products }: { products: ProductSummary[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(productId);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product.');
      }

      // Refresh the page data without a full reload
      router.refresh();

    } catch (error) {
      console.error(error);
      alert('Could not delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!products || products.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No products found.</p>
      </div>
    );
  }

  const formatShipping = (value: string) => {
    const numericValue = parseFloat(value);
    if (Number.isNaN(numericValue)) return 'N/A';
    if (numericValue === 0) return 'Free Shipping';
    return `LKR ${numericValue.toFixed(2)}`;
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="space-y-4 md:hidden">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 p-5 shadow-sm transition hover:border-slate-300 hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Added {formatDate(product.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      product.is_published
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {product.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Shipping</dt>
                    <dd
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        parseFloat(product.shipping_cost) === 0
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {formatShipping(product.shipping_cost)}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Variants</dt>
                    <dd className="text-base font-semibold text-slate-900">{product.variant_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Stock</dt>
                    <dd className="text-base font-semibold text-slate-900">{product.total_stock}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Product ID</dt>
                    <dd className="font-mono text-xs text-slate-500">...{product.id.slice(-10)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark sm:w-auto"
              >
                <Edit size={16} />
                Edit Product
              </Link>
              <button
                onClick={() => handleDelete(product.id, product.name)}
                disabled={deletingId === product.id}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 disabled:hover:bg-red-50 sm:w-auto"
              >
                {deletingId === product.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 font-medium text-gray-500">Product Name</th>
              <th className="px-4 py-3 font-medium text-center text-gray-500">Shipping Cost</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-center text-gray-500">Variants</th>
              <th className="px-4 py-3 font-medium text-center text-gray-500">Stock</th>
              <th className="px-4 py-3 font-medium text-gray-500">Date Added</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold">
                    {formatShipping(product.shipping_cost)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      product.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">{product.variant_count}</td>
                <td className="px-4 py-3 text-center">{product.total_stock}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(product.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-primary"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={deletingId === product.id}
                      className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-accent disabled:opacity-50"
                    >
                      {deletingId === product.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}