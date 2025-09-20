"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  Star, 
  CheckCircle, 
  AlertCircle,
  UploadCloud,
  ArrowLeft,
  Music,
  CreditCard
} from 'lucide-react';
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
  variantImages: File[]; // Color-specific variant images  
  sizes: SizeStock[];
  thumbnailImageName: string | null;
};

// --- HELPER COMPONENTS for better structure ---

const Card = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl">
    <div className="px-6 py-5 border-b border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }) => (
  <div>
    <label htmlFor={props.id} className="block mb-2 text-sm font-medium text-slate-700">{props.label}</label>
    <div className="relative">
      {props.icon && <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">{props.icon}</div>}
      <input
        {...props}
        className={`block w-full px-3 py-2 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm ${props.icon ? 'pl-10' : ''}`}
      />
    </div>
  </div>
);


// --- MAIN COMPONENT ---

const AddProductPage = () => {
  const router = useRouter();
  
  // --- FORM STATE ---
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [tradingImage, setTradingImage] = useState<File | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([
    { 
      id: Date.now(), 
      colorName: 'Default', 
      colorHex: '#000000', 
      price: '', 
      compareAtPrice: '', 
      sku: '', 
      variantImages: [], 
      sizes: [{ size: 'One Size', stock: 0 }], 
      thumbnailImageName: null
    }
  ]);
  const [activeVariantId, setActiveVariantId] = useState<number | null>(variants[0]?.id || null);

  // --- API & LOADING STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingColors, setExistingColors] = useState<ExistingColor[]>([]);

  // Fetch existing colors from API
  useEffect(() => {
    async function fetchColors() {
      try {
        const res = await fetch('/api/admin/products/colors', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch colors');
        const data: ExistingColor[] = await res.json();
        setExistingColors(data);
      } catch (e) {
        console.warn('Failed to load colors', e);
      }
    }
    fetchColors();
  }, []);

  // --- COMPUTED STATE ---
  const activeVariant = useMemo(() => variants.find(v => v.id === activeVariantId), [variants, activeVariantId]);
  
  const duplicateColorNames = useMemo(() => {
    const names = variants.map(v => v.colorName.trim().toLowerCase()).filter(Boolean);
    const counts = names.reduce((acc, name) => ({...acc, [name]: (acc[name] || 0) + 1}), {} as Record<string, number>);
    return new Set(Object.keys(counts).filter(name => counts[name] > 1));
  }, [variants]);
  
  // --- HANDLER FUNCTIONS (wrapped in useCallback for performance) ---

  const updateVariant = useCallback((id: number, field: keyof ProductVariant, value: string | number | File[] | SizeStock[] | null) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  }, []);

  const addVariant = useCallback(() => {
    const newId = Date.now();
    const newVariant: ProductVariant = { 
      id: newId, 
      colorName: '', 
      colorHex: '#ffffff', 
      price: '', 
      compareAtPrice: '', 
      sku: '', 
      variantImages: [], 
      sizes: [{ size: 'S', stock: 0 }], 
      thumbnailImageName: null
    };
    setVariants(prev => [...prev, newVariant]);
    setActiveVariantId(newId);
  }, []);

  const removeVariant = useCallback((idToRemove: number) => {
    setVariants(prev => {
      const newVariants = prev.filter(v => v.id !== idToRemove);
      if (activeVariantId === idToRemove) {
        setActiveVariantId(newVariants[newVariants.length - 1]?.id || null);
      }
      return newVariants;
    });
  }, [activeVariantId]);
  
  const handleImageChange = useCallback((id: number, files: FileList | null) => {
    console.log(`🖼️ handleImageChange called for variant ${id}`, files);
    if (!files) {
      console.log('❌ No files provided');
      return;
    }
    const newImages = Array.from(files);
    console.log(`📁 Adding ${newImages.length} new images:`, newImages.map(img => img.name));
    setVariants(prev => {
      const updated = prev.map(v => {
        if (v.id === id) {
          const updatedVariant = { ...v, variantImages: [...v.variantImages, ...newImages] };
          console.log(`✅ Updated variant ${id} now has ${updatedVariant.variantImages.length} images`);
          return updatedVariant;
        }
        return v;
      });
      console.log('📊 Updated variants state:', updated);
      return updated;
    });
  }, []);

  const removeImage = useCallback((variantId: number, imageToRemove: File) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, variantImages: v.variantImages.filter(img => img !== imageToRemove) } : v));
  }, []);
  
  const setThumbnail = useCallback((variantId: number, imageName: string) => {
     updateVariant(variantId, 'thumbnailImageName', imageName);
  }, [updateVariant]);

  // --- PRODUCT IMAGES HANDLERS (for each variant) ---
  // Removed - only using variant images now

  const updateSize = useCallback((variantId: number, index: number, field: keyof SizeStock, value: string | number) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, sizes: v.sizes.map((s, i) => (i === index ? { ...s, [field]: value } : s)) } : v));
  }, []);

  const addSize = useCallback((variantId: number) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, sizes: [...v.sizes, { size: '', stock: 0 }] } : v));
  }, []);

  const removeSize = useCallback((variantId: number, index: number) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, sizes: v.sizes.filter((_, i) => i !== index) } : v));
  }, []);

  // --- FORM SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (duplicateColorNames.size > 0) {
      setError('Duplicate color variants detected. Each variant must have a unique color name.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🚀 Starting form submission...');
      console.log('📊 Current variants state:', variants);
      
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('shippingCost', shippingCost);
      if (audioFile) formData.append('audioFile', audioFile);
      if (tradingImage) formData.append('tradingImage', tradingImage);
      
      // Include client-side IDs for image mapping, exclude variantImages from JSON
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const variantsForApi = variants.map(({ variantImages, ...rest }) => rest);
      console.log('🔍 Variants being sent to API:', variantsForApi);
      formData.append('variants', JSON.stringify(variantsForApi));
      
      // Add variant-specific images only
      variants.forEach(variant => {
        console.log(`🖼️ Adding images for variant ${variant.id} (${variant.colorName}): ${variant.variantImages.length} images`);
        // Add variant-specific images
        variant.variantImages.forEach((image, index) => {
          console.log(`📎 Adding image ${index + 1}: ${image.name} (${image.size} bytes) as variantImage_${variant.id}`);
          formData.append(`variantImage_${variant.id}`, image);
        });
      });

      console.log('📤 Submitting form data...');
      // Debug: Log all FormData entries
      console.log('🔍 FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      const response = await fetch('/api/admin/products', { method: 'POST', body: formData });
      
      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create product`);
      }
      
      // On success, redirect
      router.push('/admin/products?created=true');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-lg border-slate-200">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => router.back()} className="p-2 rounded-md text-slate-500 hover:bg-slate-100">
                   <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-semibold text-slate-900">Create New Product</h1>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm font-medium bg-white border rounded-lg shadow-sm text-slate-700 border-slate-300 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white border border-transparent rounded-lg shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Save Product
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="flex flex-col col-span-1 gap-8 lg:col-span-2">
              {error && (
                <div className="flex items-start gap-3 p-4 text-red-800 border border-red-200 rounded-lg bg-red-50">
                  <AlertCircle className="flex-shrink-0 w-5 h-5 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Error Creating Product</h3>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              <Card title="General Information">
                <div className="space-y-6">
                  <Input 
                    label="Product Name *" 
                    id="productName" 
                    type="text" 
                    value={productName} 
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Premium Cotton T-Shirt"
                    required 
                  />
                  <div>
                    <label htmlFor="description" className="block mb-2 text-sm font-medium text-slate-700">Description</label>
                    <textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      className="block w-full border rounded-lg shadow-sm text-slate-900 bg-slate-50 border-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="Describe your product..."
                    />
                  </div>
                </div>
              </Card>

              <Card title="Media" description="Upload product-related media files.">
                 <div className="space-y-8">
                   {/* Audio and Trading Card Section */}
                   <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {/* Audio Uploader */}
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 font-medium text-slate-800"><Music size={16} /> Product Audio</h3>
                        <label htmlFor="audioFile" className="flex flex-col items-center justify-center w-full p-4 text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-primary hover:bg-primary/5">
                          <UploadCloud size={24} className="text-slate-400" />
                          <span className="mt-2 text-sm text-slate-600">Click to upload or drag & drop</span>
                          <span className="text-xs text-slate-500">MP3, WAV, OGG (Max 10MB)</span>
                          <input id="audioFile" type="file" className="hidden" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                        </label>
                        {audioFile && <p className="p-2 text-sm text-green-700 rounded-md bg-green-50">{audioFile.name} selected</p>}
                      </div>
                      {/* Trading Card Uploader */}
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 font-medium text-slate-800"><CreditCard size={16} /> Trading Card</h3>
                        <label htmlFor="tradingImage" className="flex flex-col items-center justify-center w-full p-4 text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-primary hover:bg-primary/5">
                          <UploadCloud size={24} className="text-slate-400" />
                          <span className="mt-2 text-sm text-slate-600">Click to upload or drag & drop</span>
                          <span className="text-xs text-slate-500">PNG, JPG, WEBP (Max 5MB)</span>
                          <input id="tradingImage" type="file" className="hidden" accept="image/*" onChange={(e) => setTradingImage(e.target.files?.[0] || null)} />
                        </label>
                        {tradingImage && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-green-50">
                            <Image src={URL.createObjectURL(tradingImage)} alt="preview" width={32} height={40} className="object-cover rounded" />
                            <p className="text-sm text-green-700">{tradingImage.name} selected</p>
                          </div>
                        )}
                      </div>
                   </div>
                 </div>
              </Card>

              <Card title="Variants & Pricing" description="Manage different product options like color, size, and stock.">
                {/* Variant Tabs */}
                <div className="flex items-center border-b border-slate-200">
                  <div className="flex-1 -mb-px overflow-x-auto">
                    <nav className="flex gap-4" aria-label="Tabs">
                      {variants.map(variant => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setActiveVariantId(variant.id)}
                          className={`flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 ${
                            activeVariantId === variant.id
                              ? 'border-primary text-primary'
                              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                          }`}
                        >
                           <span className="block w-4 h-4 border rounded-full border-slate-300" style={{ backgroundColor: variant.colorHex }}></span>
                           {variant.colorName || 'New Variant'}
                        </button>
                      ))}
                    </nav>
                  </div>
                  <button type="button" onClick={addVariant} className="flex items-center gap-2 px-3 py-2 ml-4 text-sm font-medium rounded-lg text-primary hover:bg-primary/5">
                    <Plus size={16} /> Add
                  </button>
                </div>

                {/* Active Variant Content */}
                <div className="pt-6">
                  {!activeVariant ? (
                    <div className="text-center text-slate-500">
                      <p>No variant selected.</p>
                      <button type="button" onClick={addVariant} className="mt-2 text-sm font-semibold text-primary">Add your first variant</button>
                    </div>
                  ) : (
                    <div key={activeVariant.id}>
                       <div className="flex justify-end mb-4">
                        {variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(activeVariant.id)} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
                             <Trash2 size={14} /> Remove this variant
                          </button>
                        )}
                       </div>
                      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {/* Left Side: Details */}
                        <div className="space-y-6">
                          <div>
                            <Input label="Color Name *" id={`colorName-${activeVariant.id}`} type="text" value={activeVariant.colorName} onChange={e => updateVariant(activeVariant.id, 'colorName', e.target.value)} required />
                            {duplicateColorNames.has(activeVariant.colorName.trim().toLowerCase()) && <p className="mt-1 text-xs text-red-600">This color name is already in use.</p>}
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <Input label="Hex Code *" id={`colorHex-${activeVariant.id}`} type="text" value={activeVariant.colorHex} onChange={e => updateVariant(activeVariant.id, 'colorHex', e.target.value)} required />
                            </div>
                            <input type="color" value={activeVariant.colorHex} onChange={e => updateVariant(activeVariant.id, 'colorHex', e.target.value)} className="w-10 h-10 p-0 bg-transparent border-none rounded-md cursor-pointer" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Input label="Sale Price (LKR) *" id={`price-${activeVariant.id}`} type="number" value={activeVariant.price} onChange={e => updateVariant(activeVariant.id, 'price', e.target.value)} required />
                            <Input label="Original Price" id={`compareAtPrice-${activeVariant.id}`} type="number" value={activeVariant.compareAtPrice} onChange={e => updateVariant(activeVariant.id, 'compareAtPrice', e.target.value)} />
                          </div>
                          <Input label="SKU" id={`sku-${activeVariant.id}`} type="text" value={activeVariant.sku} onChange={e => updateVariant(activeVariant.id, 'sku', e.target.value)} />
                        </div>

                        {/* Right Side: Images */}
                        <div className="space-y-6">
                           <div>
                              <label className="block mb-2 text-sm font-medium text-slate-700">Variant Images (Color-specific)</label>
                              {/* Debug: Show current variant state */}
                              <div className="mb-2 text-xs text-slate-500">
                                Debug: Variant {activeVariant.id} has {activeVariant.variantImages.length} images
                              </div>
                              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                                {activeVariant.variantImages.map((image, i) => (
                                  <div key={i} className="relative group aspect-square">
                                    <Image src={URL.createObjectURL(image)} alt="upload preview" layout="fill" className="object-cover border rounded-lg border-slate-200" />
                                    <div className="absolute inset-0 flex items-center justify-center gap-1 transition-opacity bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100">
                                      <button type="button" title="Set as thumbnail" onClick={() => setThumbnail(activeVariant.id, image.name)} className="p-1.5 text-white rounded-full bg-black/50 hover:bg-primary">
                                        <Star size={14} fill={activeVariant.thumbnailImageName === image.name ? 'currentColor' : 'none'} />
                                      </button>
                                      <button type="button" title="Remove image" onClick={() => removeImage(activeVariant.id, image)} className="p-1.5 text-white rounded-full bg-black/50 hover:bg-red-600">
                                        <X size={14} />
                                      </button>
                                    </div>
                                    {activeVariant.thumbnailImageName === image.name && <div className="absolute p-1 bg-white rounded-full shadow top-1 right-1"><Star size={10} className="text-primary" fill="currentColor"/></div>}
                                  </div>
                                ))}
                                <label htmlFor={`variantImage-upload-${activeVariant.id}`} className="flex flex-col items-center justify-center text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer aspect-square border-slate-300 hover:border-primary hover:bg-primary/5">
                                  <ImageIcon size={20} className="text-slate-400" />
                                  <span className="mt-1 text-xs text-slate-500">Add</span>
                                  <input id={`variantImage-upload-${activeVariant.id}`} type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageChange(activeVariant.id, e.target.files)} />
                                </label>
                              </div>
                           </div>
                        </div>
                      </div>
                      
                      {/* Sizes & Stock Section */}
                      <div className="pt-8 mt-8 border-t border-slate-200">
                        <h3 className="text-base font-semibold text-slate-900">Sizes & Inventory</h3>
                        <div className="mt-4 space-y-3">
                           {activeVariant.sizes.map((size, i) => (
                              <div key={i} className="flex items-center gap-4">
                                 <input type="text" placeholder="Size (e.g., M)" value={size.size} onChange={e => updateSize(activeVariant.id, i, 'size', e.target.value)} className="flex-1 w-full px-3 py-2 border rounded-lg shadow-sm bg-slate-50 border-slate-300 sm:text-sm" required />
                                 <input type="number" placeholder="Stock" value={size.stock} onChange={e => updateSize(activeVariant.id, i, 'stock', parseInt(e.target.value, 10) || 0)} className="px-3 py-2 border rounded-lg shadow-sm w-28 bg-slate-50 border-slate-300 sm:text-sm" />
                                 {activeVariant.sizes.length > 1 && <button type="button" onClick={() => removeSize(activeVariant.id, i)} className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
                              </div>
                           ))}
                           <button type="button" onClick={() => addSize(activeVariant.id)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary rounded-lg hover:bg-primary/5">
                              <Plus size={16} /> Add Size
                           </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="col-span-1">
              <div className="sticky top-24">
                <Card title="Organization">
                  <div className="space-y-6">
                    <Input label="Shipping Cost (LKR)" id="shippingCost" type="number" value={shippingCost} onChange={e => setShippingCost(e.target.value)} placeholder="500" required />
                    
                    {existingColors.length > 0 && (
                      <div>
                        <h3 className="block mb-2 text-sm font-medium text-slate-700">🎨 Existing Colors</h3>
                        <div className="flex flex-wrap gap-2">
                           {existingColors.map(c => (
                            <div key={c.colorName} className="flex items-center gap-2 px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                               <span className="block w-3 h-3 border rounded-full border-slate-300" style={{backgroundColor: c.colorHex}}></span>
                               {c.colorName}
                            </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default AddProductPage;