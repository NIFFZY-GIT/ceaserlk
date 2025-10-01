import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import ProductTable from '@/app/admin/_components/ProductTable'; // We will create this next
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';

// Define the shape of the product data we expect from our API
export interface ProductSummary {
  id: string;
  name: string;
  shipping_cost: string; // Comes as string from DB
  is_published: boolean;
  created_at: string;
  variant_count: string; // Comes as string from DB aggregation
  total_stock: string;   // Comes as string from DB aggregation
}

// Data fetching function specific to this page
async function getProducts(): Promise<ProductSummary[]> {
  const baseUrl = await resolveServerBaseUrl();
  const serializedCookies = await serializeRequestCookies();

  const res = await fetch(`${baseUrl}/api/admin/products`, {
    cache: 'no-store', // IMPORTANT: Always fetch fresh data for admin pages
    headers: {
      ...(serializedCookies ? { cookie: serializedCookies } : {}),
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    console.error('Failed to fetch products:', await res.text());
    // In a real app, you'd render a proper error component here
    throw new Error('Failed to fetch products');
  }

  return res.json();
}

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Link href="/admin/products/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm bg-primary hover:bg-primary-dark">
          <PlusCircle size={18} />
          Add New Product
        </Link>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <ProductTable products={products} />
      </div>
    </div>
  );
}