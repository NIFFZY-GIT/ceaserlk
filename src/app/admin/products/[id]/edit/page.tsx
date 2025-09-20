// app/admin/products/[id]/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import EditProductForm, { FullProduct } from './_components/EditProductForm';

export default function EditProductPage() {
  const pathname = usePathname();
  // Extract ID more robustly - handle trailing slashes and ensure we get the right segment
  const id = pathname.split('/').filter(Boolean).find((segment, index, arr) => {
    // Find the segment after 'products'
    return arr[index - 1] === 'products' && segment !== 'edit';
  });

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [productData, setProductData] = useState<FullProduct | null>(null);

  useEffect(() => {
    if (!id) {
      setInitialError("Product ID is missing.");
      setLoadingInitial(false);
      return;
    }

    async function getProduct() {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to fetch product data');
        }
        const data: FullProduct = await res.json();
        setProductData(data);
      } catch (err: unknown) {
        setInitialError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoadingInitial(false);
      }
    }
    getProduct();
  }, [id]);

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-4 rounded-full border-slate-200 border-t-blue-500 animate-spin"></div>
          <p className="font-semibold text-slate-700">Loading Product...</p>
          <p className="text-sm text-slate-500">Please wait while we fetch the details.</p>
        </div>
      </div>
    );
  }

  if (initialError || !productData) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="max-w-md p-8 text-center bg-white border shadow-sm rounded-2xl border-red-200/80">
          <h1 className="text-xl font-bold text-red-700">Error Loading Product</h1>
          <p className="mt-2 text-red-600">{initialError || 'The product could not be found.'}</p>
        </div>
      </div>
    );
  }

  return <EditProductForm initialData={productData} />;
}