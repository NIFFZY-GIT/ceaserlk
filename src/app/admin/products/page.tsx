import Link from 'next/link';
import { Boxes, Layers, PackageCheck, PackageX, PlusCircle } from 'lucide-react';
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
  const totalProducts = products.length;
  const publishedCount = products.filter((product) => product.is_published).length;
  const draftCount = totalProducts - publishedCount;
  const totalVariants = products.reduce((sum, product) => sum + Number(product.variant_count ?? 0), 0);
  const totalStock = products.reduce((sum, product) => sum + Number(product.total_stock ?? 0), 0);

  const numberFormatter = new Intl.NumberFormat('en-US');
  const stats = [
    {
      name: 'Total products',
      value: numberFormatter.format(totalProducts),
      icon: Boxes,
      accent: 'from-primary/10 via-primary/5 to-white text-primary',
    },
    {
      name: 'Published',
      value: numberFormatter.format(publishedCount),
      icon: PackageCheck,
      accent: 'from-emerald-100 via-emerald-50 to-white text-emerald-700',
    },
    {
      name: 'Drafts',
      value: numberFormatter.format(draftCount),
      icon: PackageX,
      accent: 'from-amber-100 via-amber-50 to-white text-amber-700',
    },
    {
      name: 'Variants / Stock',
      value: `${numberFormatter.format(totalVariants)} / ${numberFormatter.format(totalStock)}`,
      icon: Layers,
      accent: 'from-slate-200 via-slate-100 to-white text-slate-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark sm:w-auto"
        >
          <PlusCircle size={18} />
          Add New Product
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ name, value, icon: Icon, accent }) => (
          <div
            key={name}
            className={`rounded-2xl border border-white/60 bg-gradient-to-br ${accent} p-4 shadow-sm backdrop-blur transition hover:shadow-md`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</p>
                <p className="text-lg font-semibold text-slate-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
        <ProductTable products={products} />
      </div>
    </div>
  );
}