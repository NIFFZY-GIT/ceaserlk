"use client";

import { useState, useEffect } from 'react';
import EditProductForm from './_components/EditProductForm';

// --- TYPE DEFINITIONS for data fetched from the API ---
interface ProductImage { id: string; imageUrl: string; }
interface ProductSize { id: string; size: string; stock: number; }
interface ProductVariant {
  id: string; colorName: string; colorHex: string; price: string;
  compareAtPrice: string | null; sku: string | null; thumbnailUrl: string | null;
  images: ProductImage[]; sizes: ProductSize[];
}
interface FullProduct {
  id: string; 
  name: string; 
  description: string;
  audio_url: string | null;
  shipping_cost: string;
  variants: ProductVariant[];
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  // State for initial data loading
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [productData, setProductData] = useState<FullProduct | null>(null);

  useEffect(() => {
    async function getProduct() {
      try {
        const res = await fetch(`/api/admin/products/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch product data');
        const data: FullProduct = await res.json();
        setProductData(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setInitialError(errorMessage);
      } finally {
        setLoadingInitial(false);
      }
    }
    getProduct();
  }, [params.id]);

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-gray-300 rounded-full border-t-primary animate-spin"></div>
          <p className="text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  if (initialError || !productData) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="p-6 border border-red-300 rounded-md bg-red-50">
          <h1 className="text-xl font-semibold text-red-800">Error Loading Product</h1>
          <p className="mt-2 text-red-600">{initialError || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  return <EditProductForm initialData={productData} />;
}