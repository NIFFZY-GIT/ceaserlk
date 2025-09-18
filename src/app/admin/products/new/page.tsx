"use client";

import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Trash2, ImagePlus, X, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- TYPE DEFINITIONS ---
type ExistingColor = { colorName: string; colorHex: string };

type SizeStock = { size: string; stock: number };
type ProductVariant = {
  id: number; // Temporary client-side ID
  colorName: string;
  colorHex: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  images: File[];
  sizes: SizeStock[];
  thumbnailImageName: string | null;
};

const AddProductPage = () => {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- NEW STATE for the audio file ---
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // --- NEW: existing colors from API ---
  const [existingColors, setExistingColors] = useState<ExistingColor[]>([]);

  useEffect(() => {
    let ignore = false;
    async function fetchColors() {
      try {
        const res = await fetch('/api/admin/products/colors', { cache: 'no-store' });
        if (!res.ok) return;
        const data: ExistingColor[] = await res.json();
        if (!ignore) setExistingColors(data);
      } catch (e) {
        console.warn('Failed to load colors', e);
      }
    }
    fetchColors();
    return () => { ignore = true; };
  }, []);

  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      id: Date.now(),
      colorName: '', colorHex: '#000000', price: '',
      compareAtPrice: '', sku: '', images: [],
      sizes: [{ size: 'S', stock: 0 }], thumbnailImageName: null,
    },
  ]);

  const addVariant = () => setVariants([...variants, { id: Date.now(), colorName: '', colorHex: '#000000', price: '', compareAtPrice: '', sku: '', images: [], sizes: [{ size: 'S', stock: 0 }], thumbnailImageName: null }]);
  const removeVariant = (id: number) => setVariants(variants.filter((v) => v.id !== id));

  function handleVariantChange<K extends keyof ProductVariant>(id: number, field: K, value: ProductVariant[K]) {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  const handleSizeChange = (variantId: number, index: number, field: keyof SizeStock, value: string | number) => setVariants(variants.map(v => v.id === variantId ? { ...v, sizes: v.sizes.map((s, i) => (i === index ? { ...s, [field]: value } : s)) } : v));
  const addSize = (variantId: number) => setVariants(variants.map(v => v.id === variantId ? { ...v, sizes: [...v.sizes, { size: '', stock: 0 }] } : v));
  const removeSize = (variantId: number, index: number) => setVariants(variants.map(v => v.id === variantId ? { ...v, sizes: v.sizes.filter((_, i) => i !== index) } : v));
  const setThumbnail = (variantId: number, imageName: string) => setVariants(variants.map(v => v.id === variantId ? { ...v, thumbnailImageName: imageName } : v));

  const handleImageChange = (id: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const variant = variants.find(v => v.id === id);
    if (!variant) return;
    const newImages = [...variant.images, ...Array.from(files)];
    const newThumbnail = variant.thumbnailImageName === null && newImages.length > 0 ? newImages[0].name : variant.thumbnailImageName;
    setVariants(variants.map(v => v.id === id ? { ...v, images: newImages, thumbnailImageName: newThumbnail } : v));
  };

  const removeImage = (variantId: number, imageToRemove: File) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;
    const newImages = variant.images.filter(img => img !== imageToRemove);
    let newThumbnail = variant.thumbnailImageName;
    if (variant.thumbnailImageName === imageToRemove.name) {
      newThumbnail = newImages.length > 0 ? newImages[0].name : null;
    }
    setVariants(variants.map(v => v.id === variantId ? { ...v, images: newImages, thumbnailImageName: newThumbnail } : v));
  };

  // --- NEW: compute duplicate color names within the current variants ---
  const duplicateColorNames = useMemo(() => {
    const names = variants.map(v => v.colorName.trim().toLowerCase()).filter(Boolean);
    const counts: Record<string, number> = {};
    names.forEach(n => { counts[n] = (counts[n] ?? 0) + 1; });
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([n]) => n));
  }, [variants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // --- Prevent duplicate colors among variants ---
    if (duplicateColorNames.size > 0) {
      setIsLoading(false);
      setError('Duplicate color variants detected. Please ensure each variant uses a unique color.');
      return;
    }

    const formData = new FormData();
    formData.append('productName', productName);
    formData.append('description', description);
    formData.append('shippingCost', shippingCost);

    // --- NEW: Append the audio file if it exists ---
    if (audioFile) {
      formData.append('audioFile', audioFile);
    }

    const variantsForApi = variants.map(variant => ({ ...variant, images: variant.images.map(img => img.name) }));
    
    // Debug: Log the variants being sent to API
    console.log('Sending variants to API:', variantsForApi.map(v => ({ 
        id: v.id, 
        colorName: v.colorName, 
        colorHex: v.colorHex
    })));
    
    formData.append('variants', JSON.stringify(variantsForApi));
    variants.forEach(variant => { variant.images.forEach(imageFile => { formData.append(`images_variant_${variant.id}`, imageFile); }); });

    try {
      const response = await fetch('/api/admin/products', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product.');
      }
      alert('Product created successfully!');
      router.push('/admin/products');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <div className="p-4 border border-red-300 rounded-md bg-red-50"><p className="text-red-500">{error}</p></div>}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">Base Details</h2>
          <div className="space-y-4">
            <div><label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label><input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" required /></div>
            <div><label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700">Shipping Cost (LKR)</label><input type="number" id="shippingCost" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., 500.00" min="0" step="0.01" required /><p className="mt-1 text-xs text-gray-500">Enter 0 for free shipping.</p></div>
            
            {/* --- NEW AUDIO FILE INPUT --- */}
            <div>
              <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700">Product Audio</label>
              <input type="file" id="audioFile" accept="audio/mpeg, audio/wav, audio/ogg" onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)} className="block w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {audioFile && <p className="mt-2 text-xs text-gray-500">Selected: {audioFile.name}</p>}
              <p className="mt-1 text-xs text-gray-500">Optional: Upload an MP3, WAV, or OGG file.</p>
            </div>
            
            <div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"></textarea></div>
          </div>
        </div>

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
                  {/* Color selection: existing colors display and new color picker */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    
                    {/* Display all existing colors for reference */}
                    {existingColors.length > 0 && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Colors Reference</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {existingColors.map(color => (
                            <div key={color.colorName} className="flex items-center gap-2 p-2 bg-white rounded border">
                              <div 
                                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0" 
                                style={{ backgroundColor: color.colorHex }}
                                title={`${color.colorName} - ${color.colorHex}`}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-gray-700 truncate">{color.colorName}</span>
                                <span className="text-xs text-gray-500">{color.colorHex}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New/Current Color Input */}
                    <div className="mt-4 space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Add New Color</h4>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Color Name</label>
                          <input
                            type="text"
                            value={variant.colorName}
                            onChange={e => handleVariantChange(variant.id, 'colorName', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm"
                            placeholder="e.g., Ocean Blue"
                            required
                          />
                        </div>
                        
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Hex Color Code</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={variant.colorHex}
                                onChange={e => {
                                  let value = e.target.value;
                                  if (!value.startsWith('#') && value.length > 0) {
                                    value = '#' + value;
                                  }
                                  // Validate hex format
                                  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})?$/.test(value) || value === '#') {
                                    handleVariantChange(variant.id, 'colorHex', value);
                                  }
                                }}
                                className="block w-full border-gray-300 rounded-md shadow-sm font-mono text-sm"
                                placeholder="#000000"
                                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                                required
                              />
                              <input
                                type="color"
                                value={variant.colorHex}
                                onChange={e => handleVariantChange(variant.id, 'colorHex', e.target.value)}
                                className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                                title="Click to open color picker"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Preview:</span>
                            <div 
                              className="w-10 h-10 border-2 border-gray-300 rounded-md shadow-sm"
                              style={{ backgroundColor: variant.colorHex }}
                              title={`${variant.colorName || 'Unnamed'} - ${variant.colorHex}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Duplicate warning */}
                      {variant.colorName.trim() && duplicateColorNames.has(variant.colorName.trim().toLowerCase()) && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          ⚠️ Duplicate color: another variant already uses &quot;{variant.colorName}&quot;.
                        </p>
                      )}

                      {/* Color validation */}
                      {variant.colorHex && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(variant.colorHex) && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          ⚠️ Invalid hex color format. Please use format like #FF0000 or #F00.
                        </p>
                      )}
                    </div>
                  </div>

                  <div><label className="block text-sm font-medium text-gray-700">Price (Sale Price)</label><input type="number" value={variant.price} onChange={e => handleVariantChange(variant.id, 'price', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., 49.99" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Compare At Price (Original)</label><input type="number" value={variant.compareAtPrice} onChange={e => handleVariantChange(variant.id, 'compareAtPrice', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="Optional: e.g., 59.99" /><p className="mt-1 text-xs text-gray-500">If set, will be shown as crossed out.</p></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">SKU</label><input type="text" value={variant.sku} onChange={e => handleVariantChange(variant.id, 'sku', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., TSH-OB-001" /></div>
                  <div className="md:col-span-2"><label className="block mb-2 text-sm font-medium text-gray-700">Images</label><div className="flex flex-wrap gap-4">{variant.images.map((image, index) => { const isThumbnail = variant.thumbnailImageName === image.name; return (<div key={index} className="relative group"><Image src={URL.createObjectURL(image)} alt="upload preview" width={96} height={96} className={`object-cover w-24 h-24 rounded-md border-2 ${isThumbnail ? 'border-primary' : 'border-transparent'}`} /><div className="absolute inset-0 flex items-center justify-center gap-2 transition-opacity bg-black rounded-md opacity-0 bg-opacity-60 group-hover:opacity-100"><button type="button" title="Set as thumbnail" onClick={() => setThumbnail(variant.id, image.name)} className="p-1.5 text-white bg-black/50 rounded-full hover:bg-primary"><Star size={14} fill={isThumbnail ? 'currentColor' : 'none'} /></button><button type="button" title="Remove image" onClick={() => removeImage(variant.id, image)} className="p-1.5 text-white bg-black/50 rounded-full hover:bg-red-500"><X size={14} /></button></div></div>); })}<label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50"><ImagePlus size={24} className="text-gray-400" /><span className="mt-1 text-xs text-gray-500">Add Images</span>                                    <input type="file" multiple accept="image/*" onChange={(e) => { 
                                        handleImageChange(variant.id, e.target.files);
                                        // Reset the input value so the same files can be selected again
                                        e.target.value = '';
                                    }} className="hidden" /></label></div></div>
                  <div className="md:col-span-2"><label className="block mb-2 text-sm font-medium text-gray-700">Sizes & Stock</label><div className="space-y-2">{variant.sizes.map((sizeStock, index) => (<div key={index} className="flex items-center gap-4"><input type="text" placeholder="Size (e.g., M, 32x34)" value={sizeStock.size} onChange={e => handleSizeChange(variant.id, index, 'size', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm" required /><input type="number" placeholder="Stock" value={sizeStock.stock} onChange={e => handleSizeChange(variant.id, index, 'stock', parseInt(e.target.value) || 0)} className="block w-full border-gray-300 rounded-md shadow-sm" /><>{variant.sizes.length > 1 && <button type="button" onClick={() => removeSize(variant.id, index)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>}</></div>))}<button type="button" onClick={() => addSize(variant.id)} className="flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:text-primary-dark"><PlusCircle size={16} /> Add Size</button></div></div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addVariant} className="flex items-center gap-2 px-4 py-2 mt-6 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md shadow-sm hover:bg-gray-700">
            <PlusCircle size={20} /> Add Another Variant
          </button>
        </div>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="inline-flex justify-center px-6 py-2 ml-3 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProductPage;