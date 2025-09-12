"use client";

import { useState } from 'react';
import { PlusCircle, Trash2, ImagePlus, X, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- UPDATED TYPE DEFINITIONS ---
type SizeStock = { size: string; stock: number };
type ProductVariant = {
  id: number; // Temporary client-side ID
  colorName: string;
  colorHex: string;
  price: string;
  compareAtPrice: string; // <-- NEW: The original price
  sku: string;
  images: File[];
  sizes: SizeStock[];
  thumbnailImageName: string | null; // <-- NEW: To track the main image
};

const AddProductPage = () => {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      id: Date.now(),
      colorName: '',
      colorHex: '#000000',
      price: '',
      compareAtPrice: '', // <-- NEW
      sku: '',
      images: [],
      sizes: [{ size: 'S', stock: 0 }],
      thumbnailImageName: null, // <-- NEW
    },
  ]);

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: Date.now(),
        colorName: '', 
        colorHex: '#000000', 
        price: '',
        compareAtPrice: '', // <-- NEW 
        sku: '',
        images: [], 
        sizes: [{ size: 'S', stock: 0 }], 
        thumbnailImageName: null,
      },
    ]);
  };

  const removeVariant = (id: number) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleVariantChange = (id: number, field: keyof ProductVariant, value: any) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };
  
  const handleSizeChange = (variantId: number, index: number, field: keyof SizeStock, value: any) => {
    const newVariants = variants.map(v => {
      if (v.id === variantId) {
        const newSizes = v.sizes.map((s, i) => (i === index ? {...s, [field]: value} : s));
        return {...v, sizes: newSizes};
      }
      return v;
    });
    setVariants(newVariants);
  };

  const addSize = (variantId: number) => {
    const newVariants = variants.map(v => {
      if (v.id === variantId) {
        return {...v, sizes: [...v.sizes, {size: '', stock: 0}]};
      }
      return v;
    });
    setVariants(newVariants);
  };

  const removeSize = (variantId: number, index: number) => {
    const newVariants = variants.map(v => {
        if (v.id === variantId) {
            return {...v, sizes: v.sizes.filter((_, i) => i !== index)};
        }
        return v;
    });
    setVariants(newVariants);
  };
  
  const handleImageChange = (id: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    console.log('Adding files:', files.length, 'files to variant', id); // Debug log
    
    const variant = variants.find(v => v.id === id);
    if (!variant) {
      console.error('Variant not found:', id);
      return;
    }
    
    const newFiles = Array.from(files);
    const newImages = [...variant.images, ...newFiles];
    
    console.log('New images array length:', newImages.length); // Debug log
    
    // If this is the first image and no thumbnail is set, automatically set it as the thumbnail
    const newThumbnail = variant.thumbnailImageName === null && newImages.length > 0 
      ? newImages[0].name 
      : variant.thumbnailImageName;
    
    // Update the variant with new images and thumbnail
    setVariants(variants.map(v => 
      v.id === id 
        ? { ...v, images: newImages, thumbnailImageName: newThumbnail }
        : v
    ));
  };

  const removeImage = (variantId: number, imageToRemove: File) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;
    
    const newImages = variant.images.filter(img => img !== imageToRemove);
    let newThumbnail = variant.thumbnailImageName;
    
    // If the removed image was the thumbnail, pick a new one or set to null
    if (variant.thumbnailImageName === imageToRemove.name) {
      newThumbnail = newImages.length > 0 ? newImages[0].name : null;
    }
    
    // Update the variant
    setVariants(variants.map(v => 
      v.id === variantId 
        ? { ...v, images: newImages, thumbnailImageName: newThumbnail }
        : v
    ));
  };

  // NEW: Function to set the thumbnail
  const setThumbnail = (variantId: number, imageName: string) => {
    setVariants(variants.map(v => 
      v.id === variantId 
        ? { ...v, thumbnailImageName: imageName }
        : v
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();

    // 1. Append the base product data
    formData.append('productName', productName);
    formData.append('description', description);

    // 2. Prepare and append variant data (without the File objects)
    const variantsForApi = variants.map(variant => ({
      ...variant,
      images: variant.images.map(img => img.name), // Send only image names for mapping
    }));
    formData.append('variants', JSON.stringify(variantsForApi));

    // 3. Append all the image files, keyed by their variant's temporary ID
    variants.forEach(variant => {
      variant.images.forEach(imageFile => {
        // This key format is crucial for the backend to map images to variants
        formData.append(`images_variant_${variant.id}`, imageFile);
      });
    });

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        body: formData, // The browser will automatically set the correct 'multipart/form-data' header
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product.');
      }

      alert('Product created successfully!');
      router.push('/admin/products');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Error message display */}
        {error && (
          <div className="p-4 border border-red-300 rounded-md bg-red-50">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Base Product Details */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">Base Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"></textarea>
            </div>
          </div>
        </div>

        {/* Product Variants Section */}
        <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Product Variants</h2>
            <div className="space-y-6">
                {variants.map((variant) => (
                <div key={variant.id} className="relative p-6 bg-white rounded-lg shadow">
                    {variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(variant.id)} className="absolute text-gray-400 top-4 right-4 hover:text-red-500">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* --- NEW: Color Picker + Text Input --- */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Color</label>
                            <div className="flex items-center gap-4 mt-1">
                                <input type="color" value={variant.colorHex} onChange={e => handleVariantChange(variant.id, 'colorHex', e.target.value)} className="w-10 h-10 p-1 border-gray-300 rounded-md shadow-sm" />
                                <input type="text" value={variant.colorName} onChange={e => handleVariantChange(variant.id, 'colorName', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm" placeholder="e.g., Ocean Blue" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Price (Sale Price)</label>
                            <input type="number" value={variant.price} onChange={e => handleVariantChange(variant.id, 'price', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., 49.99" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Compare At Price (Original)</label>
                            <input type="number" value={variant.compareAtPrice} onChange={e => handleVariantChange(variant.id, 'compareAtPrice', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="Optional: e.g., 59.99" />
                            <p className="mt-1 text-xs text-gray-500">If set, this will show as the original price (crossed out).</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">SKU</label>
                            <input type="text" value={variant.sku} onChange={e => handleVariantChange(variant.id, 'sku', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., TSH-OB-001" />
                        </div>
                        
                        {/* --- NEW: Images with Thumbnail Selection --- */}
                        <div className="md:col-span-2">
                           <label className="block mb-2 text-sm font-medium text-gray-700">Images</label>
                            <div className="flex flex-wrap gap-4">
                                {variant.images.map((image, index) => {
                                    const isThumbnail = variant.thumbnailImageName === image.name;
                                    return (
                                        <div key={index} className="relative group">
                                            <Image 
                                                src={URL.createObjectURL(image)} 
                                                alt="upload preview" 
                                                width={96}
                                                height={96}
                                                className={`object-cover w-24 h-24 rounded-md border-2 ${isThumbnail ? 'border-primary' : 'border-transparent'}`} 
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center gap-2 transition-opacity bg-black rounded-md opacity-0 bg-opacity-60 group-hover:opacity-100">
                                                <button type="button" title="Set as thumbnail" onClick={() => setThumbnail(variant.id, image.name)} className="p-1.5 text-white bg-black/50 rounded-full hover:bg-primary">
                                                    <Star size={14} fill={isThumbnail ? 'currentColor' : 'none'} />
                                                </button>
                                                <button type="button" title="Remove image" onClick={() => removeImage(variant.id, image)} className="p-1.5 text-white bg-black/50 rounded-full hover:bg-red-500">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                    <ImagePlus size={24} className="text-gray-400" />
                                    <span className="mt-1 text-xs text-gray-500">Add Images</span>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        onChange={(e) => {
                                            console.log('File input changed:', e.target.files?.length, 'files');
                                            handleImageChange(variant.id, e.target.files);
                                            // Reset the input value so the same files can be selected again
                                            e.target.value = '';
                                        }} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>
                        </div>
                        
                        {/* --- NEW: Text Input for Sizes --- */}
                        <div className="md:col-span-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Sizes & Stock</label>
                            <div className="space-y-2">
                            {variant.sizes.map((sizeStock, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <input type="text" placeholder="Size (e.g., M, 32x34)" value={sizeStock.size} onChange={e => handleSizeChange(variant.id, index, 'size', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm" required />
                                    <input type="number" placeholder="Stock" value={sizeStock.stock} onChange={e => handleSizeChange(variant.id, index, 'stock', parseInt(e.target.value) || 0)} className="block w-full border-gray-300 rounded-md shadow-sm" />
                                    {variant.sizes.length > 1 && <button type="button" onClick={() => removeSize(variant.id, index)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={() => addSize(variant.id)} className="flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:text-primary-dark">
                                <PlusCircle size={16} /> Add Size
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
                ))}
            </div>
            <button type="button" onClick={addVariant} className="flex items-center gap-2 px-4 py-2 mt-6 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md shadow-sm hover:bg-gray-700">
                <PlusCircle size={20} /> Add Another Variant
            </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button type="button" onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isLoading} className="inline-flex justify-center px-6 py-2 ml-3 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
        {error && <p className="mt-4 text-right text-red-600">{error}</p>}
      </form>
    </div>
  );
};

export default AddProductPage;