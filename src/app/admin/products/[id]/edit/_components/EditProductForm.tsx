"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, Trash2, PlusCircle, X, Star } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type ExistingColor = { colorName: string; colorHex: string };

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
  trading_card_image: string | null;
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

  // Form State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [variants, setVariants] = useState<VariantFormState[]>([]);
  const [tradingCardImage, setTradingCardImage] = useState<File | null>(null);
  const [currentTradingCardImage, setCurrentTradingCardImage] = useState<string | null>(null);
  const [removeTradingCard, setRemoveTradingCard] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- NEW STATE for existing colors ---
  const [existingColors, setExistingColors] = useState<ExistingColor[]>([]);

  // Load existing colors from API
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

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setProductName(initialData.name);
      setDescription(initialData.description || '');
      setShippingCost(initialData.shipping_cost || '');
      setCurrentTradingCardImage(initialData.trading_card_image);
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

  // Variant management functions
  const addVariant = () => {
    const newVariant: VariantFormState = {
      id: `temp_${Date.now()}`,
      colorName: '',
      colorHex: '#000000',
      price: '',
      compareAtPrice: '',
      sku: '',
      images: [],
      sizes: [{ id: `temp_size_${Date.now()}`, size: 'S', stock: 0 }],
      thumbnailImageUrl: null,
    };
    setVariants([...variants, newVariant]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  function handleVariantChange<K extends keyof VariantFormState>(id: string, field: K, value: VariantFormState[K]) {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  const handleSizeChange = (variantId: string, sizeId: string, field: keyof SizeState, value: string | number) => {
    setVariants(variants.map(v => 
      v.id === variantId 
        ? { ...v, sizes: v.sizes.map((s) => (s.id === sizeId ? { ...s, [field]: value } : s)) } 
        : v
    ));
  };

  const addSize = (variantId: string) => {
    const newSize: SizeState = {
      id: `temp_size_${Date.now()}`,
      size: '',
      stock: 0
    };
    setVariants(variants.map(v => 
      v.id === variantId 
        ? { ...v, sizes: [...v.sizes, newSize] } 
        : v
    ));
  };

  const removeSize = (variantId: string, sizeId: string) => {
    setVariants(variants.map(v => 
      v.id === variantId 
        ? { ...v, sizes: v.sizes.filter((s) => s.id !== sizeId) } 
        : v
    ));
  };

  const handleImageChange = (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const variant = variants.find(v => v.id === id);
    if (!variant) return;
    const newImages = [...variant.images, ...Array.from(files)];
    const newThumbnail = variant.thumbnailImageUrl === null && newImages.length > 0 
      ? (newImages[0] instanceof File ? URL.createObjectURL(newImages[0]) : newImages[0].imageUrl)
      : variant.thumbnailImageUrl;
    setVariants(variants.map(v => v.id === id ? { ...v, images: newImages, thumbnailImageUrl: newThumbnail } : v));
  };

  const removeImage = (variantId: string, imageToRemove: ImageState) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;
    const newImages = variant.images.filter(img => img !== imageToRemove);
    const imageUrl = 'imageUrl' in imageToRemove ? imageToRemove.imageUrl : URL.createObjectURL(imageToRemove);
    let newThumbnail = variant.thumbnailImageUrl;
    if (variant.thumbnailImageUrl === imageUrl) {
      newThumbnail = newImages.length > 0 
        ? (newImages[0] instanceof File ? URL.createObjectURL(newImages[0]) : newImages[0].imageUrl)
        : null;
    }
    setVariants(variants.map(v => v.id === variantId ? { ...v, images: newImages, thumbnailImageUrl: newThumbnail } : v));
  };

  const setThumbnail = (variantId: string, image: ImageState) => {
    const imageUrl = 'imageUrl' in image ? image.imageUrl : URL.createObjectURL(image);
    setVariants(variants.map(v => v.id === variantId ? { ...v, thumbnailImageUrl: imageUrl } : v));
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

    try {
      const formData = new FormData();
      
      // Add base product data
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('shippingCost', shippingCost);
      
      // Convert variants to the format expected by the API
      const variantsData = variants.map(variant => ({
        id: variant.id,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice || null,
        sku: variant.sku || null,
        thumbnailImageUrl: variant.thumbnailImageUrl,
        images: variant.images.map(image => 
          'imageUrl' in image 
            ? { id: image.id, imageUrl: image.imageUrl }
            : { name: image.name }
        ),
        sizes: variant.sizes.map(size => ({
          id: size.id,
          size: size.size,
          stock: size.stock
        }))
      }));

      formData.append('variants', JSON.stringify(variantsData));
      formData.append('variantsToDelete', JSON.stringify([]));
      formData.append('imagesToDelete', JSON.stringify([]));
      formData.append('sizesToDelete', JSON.stringify([]));

      // Add trading card image data
      if (tradingCardImage) {
        formData.append('tradingCardFile', tradingCardImage);
      }
      if (removeTradingCard) {
        formData.append('removeTradingCard', 'true');
      }

      // Add audio file data
      if (audioFile) {
        formData.append('audioFile', audioFile);
      }
      if (removeAudio) {
        formData.append('removeAudio', 'true');
      }

      // Add new image files
      variants.forEach((variant) => {
        variant.images.forEach((image) => {
          if (image instanceof File) {
            formData.append(`image_${variant.id}_${image.name}`, image);
          }
        });
      });

      const response = await fetch(`/api/admin/products/${initialData.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }

      // Success - redirect to admin products page
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
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <div className="p-4 border border-red-300 rounded-md bg-red-50"><p className="text-red-500">{error}</p></div>}
        
        {/* Base Product Details */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">Base Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" required />
            </div>
            <div>
              <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700">Shipping Cost (LKR)</label>
              <input type="number" id="shippingCost" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., 500.00" min="0" step="0.01" required />
              <p className="mt-1 text-xs text-gray-500">Enter 0 for free shipping.</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"></textarea>
            </div>

            {/* Audio File Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Audio File</label>
              {initialData.audio_url && !removeAudio ? (
                <div className="mt-2">
                  <div className="flex items-center gap-4 p-3 rounded-md bg-gray-50">
                    <audio controls className="flex-1">
                      <source src={initialData.audio_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <button
                      type="button"
                      onClick={() => setRemoveAudio(true)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
              {removeAudio && (
                <div className="p-2 mt-2 border border-red-200 rounded bg-red-50">
                  <p className="text-sm text-red-700">✓ Audio file will be removed when you save</p>
                  <button
                    type="button"
                    onClick={() => setRemoveAudio(false)}
                    className="mt-1 text-xs text-red-600 underline hover:no-underline"
                  >
                    Undo removal
                  </button>
                </div>
              )}
              <div className="mt-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAudioFile(file);
                      setRemoveAudio(false);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
                />
                <p className="mt-1 text-xs text-gray-500">Upload a new audio file (MP3, WAV, etc.)</p>
                {audioFile && (
                  <div className="p-2 mt-2 border border-green-200 rounded bg-green-50">
                    <p className="text-sm text-green-700">✓ New audio file selected: {audioFile.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trading Card Image Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Trading Card Image</label>
              {currentTradingCardImage ? (
                <div className="mt-2">
                  <div className="flex items-start gap-4 p-3 rounded-md bg-gray-50">
                    <div className="relative">
                      <Image
                        src={currentTradingCardImage}
                        alt="Current trading card"
                        width={120}
                        height={168}
                        className="object-cover rounded-md shadow-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="mb-2 text-sm text-gray-600">Current trading card image</p>
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveTradingCard(true);
                          setCurrentTradingCardImage(null);
                        }}
                        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                      >
                        Remove Current Image
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setTradingCardImage(file);
                      setRemoveTradingCard(false);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
                />
                <p className="mt-1 text-xs text-gray-500">Upload a new trading card image (PNG, JPG, etc.)</p>
                {tradingCardImage && (
                  <div className="p-2 mt-2 border border-green-200 rounded bg-green-50">
                    <p className="text-sm text-green-700">✓ New trading card selected: {tradingCardImage.name}</p>
                  </div>
                )}
              </div>
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
                  {/* Color selection with existing colors display and new color picker */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    
                    {/* Display all existing colors for reference */}
                    {existingColors.length > 0 && (
                      <div className="p-4 mt-3 rounded-lg bg-gray-50">
                        <h4 className="mb-3 text-sm font-medium text-gray-700">Existing Colors Reference</h4>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {existingColors.map(color => (
                            <div key={color.colorName} className="flex items-center gap-2 p-2 bg-white border rounded">
                              <div 
                                className="flex-shrink-0 w-6 h-6 border border-gray-300 rounded" 
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

                    {/* Current Color Input */}
                    <div className="mt-4 space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Current Color</h4>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block mb-1 text-xs font-medium text-gray-600">Color Name</label>
                          <input
                            type="text"
                            value={variant.colorName}
                            onChange={e => handleVariantChange(variant.id, 'colorName', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm"
                            placeholder="e.g., Ocean Blue"
                            required
                          />
                        </div>
                        
                        <div className="flex items-end gap-4">
                          <div className="flex-1">
                            <label className="block mb-1 text-xs font-medium text-gray-600">Hex Color Code</label>
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
                                className="block w-full font-mono text-sm border-gray-300 rounded-md shadow-sm"
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
                        <p className="p-2 text-xs text-red-600 rounded bg-red-50">
                          ⚠️ Duplicate color: another variant already uses &quot;{variant.colorName}&quot;.
                        </p>
                      )}

                      {/* Color validation */}
                      {variant.colorHex && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(variant.colorHex) && (
                        <p className="p-2 text-xs text-red-600 rounded bg-red-50">
                          ⚠️ Invalid hex color format. Please use format like #FF0000 or #F00.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (Sale Price)</label>
                    <input type="number" value={variant.price} onChange={e => handleVariantChange(variant.id, 'price', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., 49.99" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Compare At Price (Original)</label>
                    <input type="number" value={variant.compareAtPrice} onChange={e => handleVariantChange(variant.id, 'compareAtPrice', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="Optional: e.g., 59.99" />
                    <p className="mt-1 text-xs text-gray-500">If set, will be shown as crossed out.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input type="text" value={variant.sku} onChange={e => handleVariantChange(variant.id, 'sku', e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="e.g., TSH-OB-001" />
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
                        <input type="file" multiple accept="image/*" onChange={(e) => { 
                          handleImageChange(variant.id, e.target.files);
                          e.target.value = '';
                        }} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Sizes & Stock Section */}
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-700">Sizes & Stock</label>
                    <div className="space-y-2">
                      {variant.sizes.map((sizeStock) => (
                        <div key={sizeStock.id} className="flex items-center gap-4">
                          <input 
                            type="text" 
                            placeholder="Size (e.g., M, 32x34)" 
                            value={sizeStock.size} 
                            onChange={e => handleSizeChange(variant.id, sizeStock.id, 'size', e.target.value)} 
                            className="block w-full border-gray-300 rounded-md shadow-sm" 
                            required 
                          />
                          <input 
                            type="number" 
                            placeholder="Stock" 
                            value={sizeStock.stock} 
                            onChange={e => handleSizeChange(variant.id, sizeStock.id, 'stock', parseInt(e.target.value) || 0)} 
                            className="block w-full border-gray-300 rounded-md shadow-sm" 
                          />
                          {variant.sizes.length > 1 && (
                            <button type="button" onClick={() => removeSize(variant.id, sizeStock.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={18} />
                            </button>
                          )}
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

        {/* Submit Buttons */}
        <div className="flex justify-end pt-4">
          <button type="button" onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="inline-flex justify-center px-6 py-2 ml-3 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}