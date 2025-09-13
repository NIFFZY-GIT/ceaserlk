"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlusCircle, Trash2, ImagePlus, X, Star, Loader2 } from 'lucide-react';

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
  shipping_cost: string; // Add shipping cost
  variants: ProductVariant[];
}

// --- TYPE DEFINITIONS for the form's internal state ---
type ImageState = File | { id: string; imageUrl: string };
type SizeState = { id: string; size: string; stock: number };
type VariantFormState = {
  id: string; // Real UUID or temporary string like `temp_123`
  colorName: string; colorHex: string; price: string;
  compareAtPrice: string; sku: string; images: ImageState[];
  sizes: SizeState[]; thumbnailImageUrl: string | null;
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  // State for initial data loading
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [variants, setVariants] = useState<VariantFormState[]>([]);

  // State to track items to be deleted on the backend
  const [variantsToDelete, setVariantsToDelete] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [sizesToDelete, setSizesToDelete] = useState<string[]>([]);

  // UI State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function getProduct() {
      try {
        const res = await fetch(`/api/admin/products/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch product data');
        const data: FullProduct = await res.json();

        setProductName(data.name);
        setDescription(data.description || '');
        setShippingCost(data.shipping_cost?.toString() || '0');
        setCurrentAudioUrl(data.audio_url);
        setVariants(data.variants.map(v => ({
          ...v,
          compareAtPrice: v.compareAtPrice || '', sku: v.sku || '',
          images: v.images || [], sizes: v.sizes || [],
          thumbnailImageUrl: v.thumbnailUrl,
        })));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setInitialError(errorMessage);
      } finally {
        setLoadingInitial(false);
      }
    }
    getProduct();
  }, [params.id]);

  // --- HANDLER FUNCTIONS ---
  const handleVariantChange = (variantId: string, field: keyof Omit<VariantFormState, 'images' | 'sizes'>, value: string) => setVariants(variants.map(v => v.id === variantId ? { ...v, [field]: value } : v));
  const addVariant = () => setVariants([...variants, { id: `temp_${Date.now()}`, colorName: '', colorHex: '#000000', price: '', compareAtPrice: '', sku: '', images: [], sizes: [{ id: `temp_size_${Date.now()}`, size: 'S', stock: 0 }], thumbnailImageUrl: null }]);
  const removeVariant = (variantId: string) => { if (!variantId.startsWith('temp_')) { setVariantsToDelete(prev => [...prev, variantId]); } setVariants(variants.filter(v => v.id !== variantId)); };
  
  const handleImageChange = (variantId: string, files: FileList | null) => { if (!files) return; setVariants(variants.map(v => { if (v.id === variantId) { const newImages: ImageState[] = [...v.images, ...Array.from(files)]; let newThumbnail = v.thumbnailImageUrl; if (!newThumbnail) { const firstImage = newImages[0]; newThumbnail = 'imageUrl' in firstImage ? firstImage.imageUrl : URL.createObjectURL(firstImage); } return { ...v, images: newImages, thumbnailImageUrl: newThumbnail }; } return v; })); };
  const removeImage = (variantId: string, imageToRemove: ImageState) => { if ('id' in imageToRemove) { setImagesToDelete(prev => [...prev, imageToRemove.id]); } setVariants(variants.map(v => { if (v.id === variantId) { const newImages = v.images.filter(img => img !== imageToRemove); const removedUrl = 'imageUrl' in imageToRemove ? imageToRemove.imageUrl : URL.createObjectURL(imageToRemove); let newThumbnail = v.thumbnailImageUrl; if (newThumbnail === removedUrl) { newThumbnail = newImages.length > 0 ? ('imageUrl' in newImages[0] ? newImages[0].imageUrl : URL.createObjectURL(newImages[0])) : null; } return { ...v, images: newImages, thumbnailImageUrl: newThumbnail }; } return v; })); };
  const setThumbnail = (variantId: string, image: ImageState) => { const imageUrl = 'imageUrl' in image ? image.imageUrl : URL.createObjectURL(image); handleVariantChange(variantId, 'thumbnailImageUrl', imageUrl); };
  
  const addSize = (variantId: string) => setVariants(variants.map(v => v.id === variantId ? { ...v, sizes: [...v.sizes, { id: `temp_size_${Date.now()}`, size: '', stock: 0 }] } : v));
  const removeSize = (variantId: string, sizeId: string) => { if (!sizeId.startsWith('temp_')) { setSizesToDelete(prev => [...prev, sizeId]); } setVariants(variants.map(v => v.id === variantId ? { ...v, sizes: v.sizes.filter(s => s.id !== sizeId) } : v)); };
  const handleSizeChange = (variantId: string, sizeId: string, field: 'size' | 'stock', value: string | number) => setVariants(variants.map(v => v.id === variantId ? { ...v, sizes: v.sizes.map(s => s.id === sizeId ? { ...s, [field]: value } : s) } : v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    // Debug logging
    console.log('DEBUG - Form submission data:', { productName, description, variants });
    
    const formData = new FormData();
    formData.append('productName', productName);
    formData.append('description', description);
    formData.append('shippingCost', shippingCost);
    
    // Add audio file if selected
    if (audioFile) {
      formData.append('audioFile', audioFile);
    }
    
    // Add remove audio flag
    if (removeAudio) {
      formData.append('removeAudio', 'true');
    }
    
    formData.append('variantsToDelete', JSON.stringify(variantsToDelete));
    formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
    formData.append('sizesToDelete', JSON.stringify(sizesToDelete));
    const variantsForApi = variants.map(v => {
      const thumbnailImageName = v.images.find(img => {
        const imageUrl = 'imageUrl' in img ? img.imageUrl : URL.createObjectURL(img as File);
        return imageUrl === v.thumbnailImageUrl;
      });
      
      return {
        ...v,
        images: v.images.map(img => ('imageUrl' in img ? { id: img.id, imageUrl: img.imageUrl } : { name: (img as File).name })),
        thumbnailImageName: thumbnailImageName ? ('imageUrl' in thumbnailImageName ? null : (thumbnailImageName as File).name) : null
      };
    });
    formData.append('variants', JSON.stringify(variantsForApi));
    variants.forEach(v => { v.images.forEach(img => { if (img instanceof File) { formData.append(`image_${v.id}_${img.name}`, img); } }); });
    
    // Debug FormData content
    console.log('DEBUG - FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }
    try { 
      const response = await fetch(`/api/admin/products/${params.id}`, { method: 'PUT', body: formData }); 
      if (!response.ok) { 
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed.'); 
      } 
      alert('Product updated!'); 
      router.push('/admin/products'); 
      router.refresh(); 
    } catch (err: unknown) { 
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setSubmitError(errorMessage); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (loadingInitial) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (initialError) return <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded-md">Error loading product: {initialError}</div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">Base Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input 
                type="text" 
                id="productName" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" 
                required 
              />
            </div>
            
            {/* SHIPPING COST FIELD */}
            <div>
              <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700">
                Shipping Cost (LKR)
              </label>
              <input 
                type="number" 
                id="shippingCost" 
                value={shippingCost} 
                onChange={(e) => setShippingCost(e.target.value)} 
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" 
                placeholder="e.g., 500.00"
                min="0"
                step="0.01"
                required 
              />
               <p className="mt-1 text-xs text-gray-500">
                  Enter 0 for free shipping on this product.
                </p>
            </div>
            
            {/* AUDIO FILE FIELD */}
            <div>
              <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700">
                Product Audio File
              </label>
              <input 
                type="file" 
                id="audioFile" 
                accept="audio/*" 
                disabled={removeAudio}
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)} 
                className="block w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload an audio file for your product (e.g., sound demo, pronunciation guide)
              </p>
              {currentAudioUrl && !removeAudio && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Current Audio:</p>
                  <div className="flex items-center gap-4 mt-1">
                    <audio controls className="flex-1">
                      <source src={currentAudioUrl} type="audio/mpeg" />
                      <source src={currentAudioUrl} type="audio/wav" />
                      <source src={currentAudioUrl} type="audio/ogg" />
                      Your browser does not support the audio element.
                    </audio>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveAudio(true);
                        setAudioFile(null); // Clear any selected new file
                      }}
                      className="px-3 py-1 text-sm text-red-600 transition-colors border border-red-300 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {removeAudio && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700">Audio will be removed when you save.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveAudio(false);
                      setAudioFile(null); // Clear any selected new file
                    }}
                    className="mt-1 text-sm text-red-600 underline hover:no-underline"
                  >
                    Undo
                  </button>
                </div>
              )}
              {audioFile && (
                <p className="mt-1 text-sm text-green-600">
                  New file selected: {audioFile.name}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4} 
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Product Variants</h2>
          <div className="space-y-6">
            {variants.map((variant) => (
            <div key={variant.id} className="relative p-6 bg-white rounded-lg shadow">
              <button type="button" onClick={() => removeVariant(variant.id)} className="absolute text-gray-400 top-4 right-4 hover:text-red-500">
                <Trash2 size={20} />
              </button>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <div className="flex items-center gap-4 mt-1">
                    <input 
                      type="color" 
                      value={variant.colorHex} 
                      onChange={e => handleVariantChange(variant.id, 'colorHex', e.target.value)} 
                      className="w-10 h-10 p-1 border-gray-300 rounded-md shadow-sm" 
                    />
                    <input 
                      type="text" 
                      value={variant.colorName} 
                      onChange={e => handleVariantChange(variant.id, 'colorName', e.target.value)} 
                      className="block w-full border-gray-300 rounded-md shadow-sm" 
                      placeholder="e.g., Ocean Blue" 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (Sale Price)</label>
                  <input 
                    type="number" 
                    value={variant.price} 
                    onChange={e => handleVariantChange(variant.id, 'price', e.target.value)} 
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" 
                    placeholder="e.g., 49.99" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compare At Price (Original)</label>
                  <input 
                    type="number" 
                    value={variant.compareAtPrice} 
                    onChange={e => handleVariantChange(variant.id, 'compareAtPrice', e.target.value)} 
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" 
                    placeholder="Optional: e.g., 59.99" 
                  />
                  <p className="mt-1 text-xs text-gray-500">The original, crossed-out price.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input 
                    type="text" 
                    value={variant.sku} 
                    onChange={e => handleVariantChange(variant.id, 'sku', e.target.value)} 
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" 
                    placeholder="e.g., TSH-OB-001" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 text-sm font-medium text-gray-700">Images</label>
                  <div className="flex flex-wrap gap-4">
                    {variant.images.map((image) => { 
                      const isExisting = 'imageUrl' in image; 
                      const imageUrl = isExisting ? image.imageUrl : URL.createObjectURL(image); 
                      const isThumbnail = variant.thumbnailImageUrl === imageUrl; 
                      return (
                        <div key={isExisting ? image.id : (image as File).name} className="relative group">
                          <Image 
                            src={imageUrl} 
                            alt="product" 
                            width={96}
                            height={96}
                            className={`object-cover w-24 h-24 rounded-md border-2 ${isThumbnail ? 'border-primary' : 'border-transparent'}`} 
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 transition-opacity bg-black rounded-md opacity-0 bg-opacity-60 group-hover:opacity-100">
                            <button type="button" title="Set as thumbnail" onClick={() => setThumbnail(variant.id, image)} className="p-1.5 text-white bg-black/50 rounded-full hover:bg-primary">
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
                      <input type="file" multiple accept="image/*" onChange={e => handleImageChange(variant.id, e.target.files)} className="hidden" />
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 text-sm font-medium text-gray-700">Sizes & Stock</label>
                  <div className="space-y-2">
                    {variant.sizes.map((size) => (
                      <div key={size.id} className="flex items-center gap-4">
                        <input 
                          type="text" 
                          placeholder="Size (e.g., M, 32x34)" 
                          value={size.size} 
                          onChange={e => handleSizeChange(variant.id, size.id, 'size', e.target.value)} 
                          className="block w-full border-gray-300 rounded-md shadow-sm" 
                          required 
                        />
                        <input 
                          type="number" 
                          placeholder="Stock" 
                          value={size.stock} 
                          onChange={e => handleSizeChange(variant.id, size.id, 'stock', parseInt(e.target.value) || 0)} 
                          className="block w-full border-gray-300 rounded-md shadow-sm" 
                        />
                        <button 
                          type="button" 
                          onClick={() => removeSize(variant.id, size.id)} 
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => addSize(variant.id)} 
                      className="flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      <PlusCircle size={16} /> Add Size
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
          <button 
            type="button" 
            onClick={addVariant} 
            className="flex items-center gap-2 px-4 py-2 mt-6 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md shadow-sm hover:bg-gray-700"
          >
            <PlusCircle size={20} /> Add Another Variant
          </button>
        </div>
        <div className="flex justify-end pt-4">
          <button 
            type="button" 
            onClick={() => router.push('/admin/products')} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="inline-flex items-center justify-center px-6 py-2 ml-3 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
        {submitError && <p className="mt-4 text-right text-red-600">{submitError}</p>}
      </form>
    </div>
  );
}