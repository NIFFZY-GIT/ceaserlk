"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, Loader2 } from 'lucide-react';

// Define types locally since they're not exported from parent
interface ProductImage { 
  id: string; 
  imageUrl: string; 
}

interface ProductSize { 
  id: string; 
  size: string; 
  stock: number; 
}

interface ProductVariant {
  id: string; 
  colorName: string; 
  colorHex: string; 
  price: string;
  compareAtPrice: string | null; 
  sku: string | null; 
  thumbnailUrl: string | null;
  images: ProductImage[]; 
  sizes: ProductSize[];
}

interface FullProduct {
  id: string; 
  name: string; 
  description: string;
  audio_url: string | null;
  shipping_cost: string;
  variants: ProductVariant[];
}

// Define the shape of our form's state
type ImageState = File | { id: string; imageUrl: string };
type SizeState = { id: string; size: string; stock: number };
type VariantFormState = {
  id: string; // Can be a real UUID or a temporary ID like `temp_123`
  colorName: string;
  colorHex: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  images: ImageState[];
  sizes: SizeState[];
  thumbnailImageUrl: string | null;
};

export default function EditProductForm({ initialData }: { initialData: FullProduct }) {
  const router = useRouter();

  // --- DEBUGGING: Verify data is arriving on the client ---
  // console.log("Initial Data Prop:", initialData);

  // Form State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<VariantFormState[]>([]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setProductName(initialData.name);
      setDescription(initialData.description || '');
      setVariants(initialData.variants.map((v: ProductVariant) => ({
        ...v,
        compareAtPrice: v.compareAtPrice || '',
        sku: v.sku || '',
        images: v.images || [],
        sizes: (v.sizes || []).map((s: ProductSize) => ({ ...s, id: s.id })),
        thumbnailImageUrl: v.thumbnailUrl,
      })));
    }
  }, [initialData]);

  // --- All your handler functions (addVariant, removeVariant, etc.) go here ---
  // (These can be copied from the previous complete example)

  const handleSubmit = async (e: React.FormEvent) => {
    // ... your full handleSubmit logic from the previous answer ...
    e.preventDefault();
    alert('Connect this to the full PUT request logic.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Base Product Details */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Base Details</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label>
            <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"></textarea>
          </div>
        </div>
      </div>

      {/* Product Variants Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Product Variants</h2>
        <div className="space-y-6">
          {variants.map((variant) => (
            <div key={variant.id} className="relative p-6 bg-white rounded-lg shadow">
              {/* This is the content that was missing */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Inputs for color, price, etc. will go here */}
                {/* Example: */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <div className="flex items-center gap-4 mt-1">
                    <input type="color" value={variant.colorHex} /* onChange={...} */ className="w-10 h-10 p-1 border-gray-300 rounded-md shadow-sm" />
                    <input type="text" value={variant.colorName} /* onChange={...} */ className="block w-full border-gray-300 rounded-md shadow-sm" placeholder="e.g., Ocean Blue" required />
                  </div>
                </div>

                {/* Images Section */}
                <div className="md:col-span-2">
                  <label className="block mb-2 text-sm font-medium text-gray-700">Images</label>
                  <div className="flex flex-wrap gap-4">
                    {variant.images.map((image) => {
                      const isExisting = 'imageUrl' in image;
                      const imageUrl = isExisting ? image.imageUrl : URL.createObjectURL(image);
                      const isThumbnail = variant.thumbnailImageUrl === imageUrl;
                      return (
                        <div key={isExisting ? image.id : image.name} className="relative group">
                          <Image 
                            src={imageUrl} 
                            alt="product" 
                            width={96}
                            height={96}
                            className={`object-cover w-24 h-24 rounded-md border-2 ${isThumbnail ? 'border-primary' : 'border-transparent'}`} 
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 transition-opacity bg-black rounded-md opacity-0 bg-opacity-60 group-hover:opacity-100">
                             {/* Buttons for setting thumbnail and removing */}
                          </div>
                        </div>
                      );
                    })}
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                      <ImagePlus size={24} className="text-gray-400" />
                      <span className="mt-1 text-xs text-gray-500">Add Images</span>
                      <input type="file" multiple /* onChange={...} */ className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Add Variant button would go here */}
      </div>

      {/* Submit Buttons (These were already showing) */}
      <div className="flex justify-end pt-4">
        <button type="button" onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2 ml-3 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-dark disabled:opacity-50">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
        </button>
      </div>
      {error && <p className="mt-4 text-right text-red-600">{error}</p>}
    </form>
  );
}