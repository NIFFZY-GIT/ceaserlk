"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { ProductSummary } from '../page'; // Import the type from the parent page

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 font-medium text-gray-500">Product Name</th>
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
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {product.is_published ? 'Published' : 'Draft'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">{product.variant_count}</td>
              <td className="px-4 py-3 text-center">{product.total_stock}</td>
              <td className="px-4 py-3 text-gray-600">
                {new Date(product.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/products/${product.id}/edit`} className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-primary">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDelete(product.id, product.name)} disabled={deletingId === product.id} className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-accent disabled:opacity-50">
                    {deletingId === product.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}