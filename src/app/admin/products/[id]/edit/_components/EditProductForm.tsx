// app/admin/products/[id]/_components/EditProductForm.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

// --- TYPE DEFINITIONS ---
// Data from API
interface ProductImage { id: string; imageUrl: string; }
interface ProductSize { id: string; size: string; stock: number; }
interface ProductVariant {
  id: string; colorName: string; colorHex: string; price: string;
  compareAtPrice: string | null; sku: string | null; thumbnailUrl: string | null;
  images: ProductImage[]; sizes: ProductSize[];
}
export interface FullProduct {
  id: string; name: string; description: string | null; audio_url: string | null;
  trading_card_image: string | null; shipping_cost: string; variants: ProductVariant[];
}
type ExistingColor = { colorName: string; colorHex: string };

// Internal Form State
type ImageState = File | { id: string; imageUrl: string };
type SizeState = { id: string; size: string; stock: number };
type VariantFormState = {
  id: string; // Real UUID or `temp_...` for new variants
  colorName: string; colorHex: string; price: string; compareAtPrice: string;
  sku: string; images: ImageState[]; sizes: SizeState[]; thumbnailUrl: string | null;
};

// --- HELPER COMPONENTS ---
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
        className={`block w-full px-3 py-2 text-slate-900 bg-slate-50 border border-slate-300 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${props.icon ? 'pl-10' : ''}`}
      />
    </div>
  </div>
);


// --- MAIN EDIT FORM COMPONENT ---
export default function EditProductForm({ initialData }: { initialData: FullProduct }) {
  const router = useRouter();

  // --- FORM STATE ---
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  
  // Media State
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  
  const [currentTradingCardUrl, setCurrentTradingCardUrl] = useState<string | null>(null);
  const [tradingImage, setTradingImage] = useState<File | null>(null);
  const [removeTradingCard, setRemoveTradingCard] = useState(false);
  
  // Variants State
  const [variants, setVariants] = useState<VariantFormState[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  // Deletion Tracking State
  const [variantsToDelete, setVariantsToDelete] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [sizesToDelete, setSizesToDelete] = useState<string[]>([]);
  
  // API & Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingColors, setExistingColors] = useState<ExistingColor[]>([]);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setProductName(initialData.name);
      setDescription(initialData.description || '');
      setShippingCost(initialData.shipping_cost || '');
      setCurrentAudioUrl(initialData.audio_url);
      setCurrentTradingCardUrl(initialData.trading_card_image);
      
      const formVariants = initialData.variants.map(v => ({
        ...v,
        compareAtPrice: v.compareAtPrice || '',
        sku: v.sku || '',
        images: v.images || [],
        sizes: (v.sizes || []).map(s => ({ ...s, id: s.id })),
        thumbnailUrl: v.thumbnailUrl,
      }));
      setVariants(formVariants);
      setActiveVariantId(formVariants[0]?.id || null);
    }
  }, [initialData]);

  // Fetch existing colors from API
  useEffect(() => {
    async function fetchColors() {
      try {
        const res = await fetch('/api/admin/products/colors', { cache: 'no-store' });
        if (res.ok) setExistingColors(await res.json());
      } catch (e) { console.warn('Failed to load colors', e); }
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

  // --- HANDLER FUNCTIONS ---
  const updateVariant = useCallback((id: string, field: keyof VariantFormState, value: string | number | ImageState[] | SizeState[] | null) => {
    setVariants(prev => prev.map(v => (v.id === id ? { ...v, [field]: value } : v)));
  }, []);

  const addVariant = useCallback(() => {
    const newId = `temp_${Date.now()}`;
    const newVariant: VariantFormState = { id: newId, colorName: '', colorHex: '#ffffff', price: '', compareAtPrice: '', sku: '', images: [], sizes: [{ id: `temp_size_${Date.now()}`, size: 'S', stock: 0 }], thumbnailUrl: null };
    setVariants(prev => [...prev, newVariant]);
    setActiveVariantId(newId);
  }, []);

  const removeVariant = useCallback((idToRemove: string) => {
    // If it's a real variant (not a temp one), track its ID for deletion
    if (!idToRemove.startsWith('temp_')) {
      setVariantsToDelete(prev => [...prev, idToRemove]);
    }
    setVariants(prev => {
      const newVariants = prev.filter(v => v.id !== idToRemove);
      if (activeVariantId === idToRemove) {
        setActiveVariantId(newVariants[newVariants.length - 1]?.id || null);
      }
      return newVariants;
    });
  }, [activeVariantId]);
  
  const handleImageChange = useCallback((id: string, files: FileList | null) => {
    if (!files) return;
    updateVariant(id, 'images', [...(variants.find(v => v.id === id)?.images || []), ...Array.from(files)]);
  }, [variants, updateVariant]);

  const removeImage = useCallback((variantId: string, imageToRemove: ImageState) => {
    // If it's an existing image, track its ID for deletion
    if ('id' in imageToRemove) {
        setImagesToDelete(prev => [...prev, imageToRemove.id]);
    }
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;
    
    const newImages = variant.images.filter(img => img !== imageToRemove);
    const imageUrl = 'imageUrl' in imageToRemove ? imageToRemove.imageUrl : URL.createObjectURL(imageToRemove);
    
    // If removing the thumbnail, pick a new one
    let newThumbnail = variant.thumbnailUrl;
    if (variant.thumbnailUrl === imageUrl) {
      newThumbnail = newImages.length > 0 ? ('imageUrl' in newImages[0] ? newImages[0].imageUrl : URL.createObjectURL(newImages[0])) : null;
    }

    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, images: newImages, thumbnailUrl: newThumbnail } : v));
  }, [variants]);
  
  const setThumbnail = useCallback((variantId: string, image: ImageState) => {
    const imageUrl = 'imageUrl' in image ? image.imageUrl : URL.createObjectURL(image);
    updateVariant(variantId, 'thumbnailUrl', imageUrl);
  }, [updateVariant]);

  const addSize = useCallback((variantId: string) => {
    const newSize = { id: `temp_size_${Date.now()}`, size: '', stock: 0 };
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, sizes: [...v.sizes, newSize] } : v));
  }, []);

  const removeSize = useCallback((variantId: string, sizeId: string) => {
    if (!sizeId.startsWith('temp_')) {
      setSizesToDelete(prev => [...prev, sizeId]);
    }
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, sizes: v.sizes.filter(s => s.id !== sizeId) } : v));
  }, []);

  // --- FORM SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (duplicateColorNames.size > 0) {
      setError('Duplicate color variants detected. Each variant must have a unique color name.');
      setIsLoading(false); return;
    }

    try {
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('shippingCost', shippingCost);

      // Handle file updates
      if (audioFile) formData.append('audioFile', audioFile);
      if (removeAudio) formData.append('removeAudio', 'true');
      if (tradingImage) formData.append('tradingCardFile', tradingImage);
      if (removeTradingCard) formData.append('removeTradingCard', 'true');

      // Append deletion arrays
      formData.append('variantsToDelete', JSON.stringify(variantsToDelete));
      formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
      formData.append('sizesToDelete', JSON.stringify(sizesToDelete));

      // Append variant data and new images
      const variantsDataForApi = variants.map(v => {
        const newImagesForVariant: string[] = [];
        v.images.forEach(img => {
          if (img instanceof File) {
            formData.append(`image_${v.id}_${img.name}`, img);
            newImagesForVariant.push(img.name);
          }
        });

        // This structured data helps backend identify what's new vs. what's existing
        return {
          id: v.id,
          colorName: v.colorName,
          colorHex: v.colorHex,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          sku: v.sku,
          thumbnailUrl: v.thumbnailUrl,
          existingImageIds: v.images.filter(img => 'id' in img).map(img => (img as ProductImage).id),
          newImageNames: newImagesForVariant,
          sizes: v.sizes,
        };
      });
      formData.append('variants', JSON.stringify(variantsDataForApi));

      const response = await fetch(`/api/admin/products/${initialData.id}`, { method: 'PUT', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      router.push('/admin/products?updated=true');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialData) return null; // Or a loading spinner

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
                <h1 className="text-xl font-semibold text-slate-900">Edit Product</h1>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm font-medium bg-white border rounded-lg shadow-sm text-slate-700 border-slate-300 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? (
                    <><div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>Saving...</>
                  ) : (
                    <><CheckCircle size={16} /> Save Changes</>
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
                    <h3 className="font-semibold">Error Updating Product</h3>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              <Card title="General Information">
                <div className="space-y-6">
                  <Input label="Product Name *" id="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required />
                  <div>
                    <label htmlFor="description" className="block mb-2 text-sm font-medium text-slate-700">Description</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="block w-full border rounded-lg shadow-sm text-slate-900 bg-slate-50 border-slate-300 sm:text-sm" />
                  </div>
                </div>
              </Card>

              <Card title="Media" description="Manage optional product-related media files.">
                 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Audio Manager */}
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 font-medium text-slate-800"><Music size={16} /> Product Audio</h3>
                      {currentAudioUrl && !removeAudio && !audioFile && (
                        <div className="p-2 space-y-2 rounded-md bg-slate-100">
                          <audio controls src={currentAudioUrl} className="w-full h-10" />
                          <button type="button" onClick={() => setRemoveAudio(true)} className="w-full px-2 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50">Remove Audio</button>
                        </div>
                      )}
                      {(removeAudio || audioFile) && (
                        <div className={`p-2 text-sm rounded-md ${removeAudio ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                          {removeAudio ? 'Audio will be removed on save.' : `New audio selected: ${audioFile?.name}`}
                          <button type="button" onClick={() => { setRemoveAudio(false); setAudioFile(null); }} className="ml-2 text-xs font-semibold underline">Undo</button>
                        </div>
                      )}
                      <label htmlFor="audioFile" className="flex flex-col items-center justify-center w-full p-4 text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-blue-500 hover:bg-blue-50">
                        <UploadCloud size={24} className="text-slate-400" />
                        <span className="mt-2 text-sm text-slate-600">Upload new audio</span>
                        <input id="audioFile" type="file" className="hidden" accept="audio/*" onChange={(e) => { setAudioFile(e.target.files?.[0] || null); setRemoveAudio(false); }} />
                      </label>
                    </div>

                    {/* Trading Card Manager */}
                     <div className="space-y-2">
                        <h3 className="flex items-center gap-2 font-medium text-slate-800"><CreditCard size={16} /> Trading Card</h3>
                        {currentTradingCardUrl && !removeTradingCard && !tradingImage && (
                          <div className="p-2 space-y-2 rounded-md bg-slate-100">
                            <Image src={currentTradingCardUrl} alt="Current Card" width={100} height={140} className="object-cover mx-auto rounded-md" />
                            <button type="button" onClick={() => setRemoveTradingCard(true)} className="w-full px-2 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50">Remove Card</button>
                          </div>
                        )}
                        {(removeTradingCard || tradingImage) && (
                          <div className={`p-2 text-sm rounded-md ${removeTradingCard ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {removeTradingCard ? 'Trading card will be removed on save.' : `New card selected.`}
                            <button type="button" onClick={() => { setRemoveTradingCard(false); setTradingImage(null); }} className="ml-2 text-xs font-semibold underline">Undo</button>
                          </div>
                        )}
                        <label htmlFor="tradingImage" className="flex flex-col items-center justify-center w-full p-4 text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-blue-500 hover:bg-blue-50">
                          <UploadCloud size={24} className="text-slate-400" />
                          <span className="mt-2 text-sm text-slate-600">Upload new card</span>
                          <input id="tradingImage" type="file" className="hidden" accept="image/*" onChange={(e) => { setTradingImage(e.target.files?.[0] || null); setRemoveTradingCard(false); }} />
                        </label>
                     </div>
                 </div>
              </Card>
              
              {/* NOTE: Variant Card JSX is identical to the Add page, as the logic is handled by state handlers */}
              <Card title="Variants & Pricing">
                {/* Variant Tabs */}
                <div className="flex items-center border-b border-slate-200">
                  <div className="flex-1 -mb-px overflow-x-auto"><nav className="flex gap-4">
                    {variants.map(variant => (
                      <button key={variant.id} type="button" onClick={() => setActiveVariantId(variant.id)}
                        className={`flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 ${activeVariantId === variant.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                         <span className="block w-4 h-4 border rounded-full border-slate-300" style={{ backgroundColor: variant.colorHex }}></span>
                         {variant.colorName || 'New Variant'}
                      </button>
                    ))}
                  </nav></div>
                  <button type="button" onClick={addVariant} className="flex items-center gap-2 px-3 py-2 ml-4 text-sm font-medium text-blue-600 rounded-lg hover:bg-blue-50"><Plus size={16} /> Add</button>
                </div>
                {/* Active Variant Content */}
                <div className="pt-6">{!activeVariant ? (<div className="text-center text-slate-500"><p>No variant selected.</p></div>) : (
                  <div key={activeVariant.id}>
                     <div className="flex justify-end mb-4">{variants.length > 1 && (<button type="button" onClick={() => removeVariant(activeVariant.id)} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"><Trash2 size={14} /> Remove this variant</button>)}</div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      <div className="space-y-6"> {/* Details */}
                        <div>
                          <Input label="Color Name *" id={`colorName-${activeVariant.id}`} type="text" value={activeVariant.colorName} onChange={e => updateVariant(activeVariant.id, 'colorName', e.target.value)} required />
                          {duplicateColorNames.has(activeVariant.colorName.trim().toLowerCase()) && <p className="mt-1 text-xs text-red-600">This color name is already in use.</p>}
                        </div>
                        <div className="flex items-end gap-4">
                          <div className="flex-1"><Input label="Hex Code *" id={`colorHex-${activeVariant.id}`} type="text" value={activeVariant.colorHex} onChange={e => updateVariant(activeVariant.id, 'colorHex', e.target.value)} required /></div>
                          <input type="color" value={activeVariant.colorHex} onChange={e => updateVariant(activeVariant.id, 'colorHex', e.target.value)} className="w-10 h-10 p-0 bg-transparent border-none rounded-md cursor-pointer" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input label="Sale Price (LKR) *" id={`price-${activeVariant.id}`} type="number" value={activeVariant.price} onChange={e => updateVariant(activeVariant.id, 'price', e.target.value)} required />
                          <Input label="Original Price" id={`compareAtPrice-${activeVariant.id}`} type="number" value={activeVariant.compareAtPrice} onChange={e => updateVariant(activeVariant.id, 'compareAtPrice', e.target.value)} />
                        </div>
                        <Input label="SKU" id={`sku-${activeVariant.id}`} type="text" value={activeVariant.sku} onChange={e => updateVariant(activeVariant.id, 'sku', e.target.value)} />
                      </div>
                      <div className="space-y-6"> {/* Images */}
                         <div>
                            <label className="block mb-2 text-sm font-medium text-slate-700">Images</label>
                            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                              {activeVariant.images.map((image, index) => {
                                const imageUrl = 'imageUrl' in image ? image.imageUrl : URL.createObjectURL(image);
                                return (
                                <div key={'id' in image ? image.id : `${image.name}-${index}`} className="relative group aspect-square">
                                  <Image src={imageUrl} alt="upload preview" layout="fill" className="object-cover border rounded-lg border-slate-200" />
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 transition-opacity bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100">
                                    <button type="button" title="Set as thumbnail" onClick={() => setThumbnail(activeVariant.id, image)} className="p-1.5 text-white rounded-full bg-black/50 hover:bg-blue-600"><Star size={14} fill={activeVariant.thumbnailUrl === imageUrl ? 'currentColor' : 'none'} /></button>
                                    <button type="button" title="Remove image" onClick={() => removeImage(activeVariant.id, image)} className="p-1.5 text-white rounded-full bg-black/50 hover:bg-red-600"><X size={14} /></button>
                                  </div>
                                  {activeVariant.thumbnailUrl === imageUrl && <div className="absolute p-1 bg-white rounded-full shadow top-1 right-1"><Star size={10} className="text-blue-500" fill="currentColor"/></div>}
                                </div>
                              )})}
                              <label htmlFor={`image-upload-${activeVariant.id}`} className="flex flex-col items-center justify-center text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer aspect-square border-slate-300 hover:border-blue-500 hover:bg-blue-50">
                                <ImageIcon size={20} className="text-slate-400" /><span className="mt-1 text-xs text-slate-500">Add</span>
                                <input id={`image-upload-${activeVariant.id}`} type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageChange(activeVariant.id, e.target.files)} />
                              </label>
                            </div>
                         </div>
                      </div>
                    </div>
                    {/* Sizes & Stock Section */}
                    <div className="pt-8 mt-8 border-t border-slate-200">
                      <h3 className="text-base font-semibold text-slate-900">Sizes & Inventory</h3>
                      <div className="mt-4 space-y-3">
                         {activeVariant.sizes.map((size) => (
                            <div key={size.id} className="flex items-center gap-4">
                               <input type="text" placeholder="Size (e.g., M)" value={size.size} onChange={e => updateVariant(activeVariant.id, 'sizes', activeVariant.sizes.map(s => s.id === size.id ? {...s, size: e.target.value} : s))} className="flex-1 w-full px-3 py-2 border rounded-lg shadow-sm bg-slate-50 border-slate-300 sm:text-sm" required />
                               <input type="number" placeholder="Stock" value={size.stock} onChange={e => updateVariant(activeVariant.id, 'sizes', activeVariant.sizes.map(s => s.id === size.id ? {...s, stock: parseInt(e.target.value, 10) || 0} : s))} className="px-3 py-2 border rounded-lg shadow-sm w-28 bg-slate-50 border-slate-300 sm:text-sm" />
                               {activeVariant.sizes.length > 1 && <button type="button" onClick={() => removeSize(activeVariant.id, size.id)} className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
                            </div>
                         ))}
                         <button type="button" onClick={() => addSize(activeVariant.id)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 rounded-lg hover:bg-blue-50"><Plus size={16} /> Add Size</button>
                      </div>
                    </div>
                  </div>
                )}</div>
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
                               <span className="block w-3 h-3 border rounded-full border-slate-300" style={{backgroundColor: c.colorHex}}></span>{c.colorName}
                            </div>))}
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
}