"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Plus, X, UploadCloud, Music, FileAudio, Trash2, Edit } from 'lucide-react';

// Define the types for our form state
interface ColorInput {
  id: number;
  name: string;
  hex_code: string;
}

interface SizeInput {
  id: number;
  name: string;
}

interface ImageInput {
  id: number;
  file: File;
  previewUrl: string;
}

interface ProductVariant {
  id: number;
  imageId: number;
  colorId: number;
  sizeId: number;
  stock: number;
}

interface ExistingColor {
  name: string;
  hex_code: string;
  source: 'global' | 'product';
}

export default function NewProductPage() {
  const router = useRouter();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  
  // Dynamic state for variants
  const [colors, setColors] = useState<ColorInput[]>([]);
  const [sizes, setSizes] = useState<SizeInput[]>([]);
  const [images, setImages] = useState<ImageInput[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  
  // Existing colors from database
  const [existingColors, setExistingColors] = useState<ExistingColor[]>([]);
  
  // Form inputs
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newSizeName, setNewSizeName] = useState('');

  // Audio file
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Control state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing colors on component mount
  useEffect(() => {
    const fetchExistingColors = async () => {
      try {
        const res = await fetch('/api/admin/colors');
        if (res.ok) {
          const data = await res.json();
          setExistingColors(data.colors || []);
        }
      } catch (error) {
        console.error('Failed to fetch existing colors:', error);
      }
    };
    fetchExistingColors();
  }, []);

  // --- Handlers for Colors ---
  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    
    const trimmedName = newColorName.trim();
    
    // Check if color already exists in current selection
    if (colors.find(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`Color "${trimmedName}" is already added to this product.`);
      return;
    }
    
    // Check if color exists in database
    const existingColor = existingColors.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingColor) {
      setError(`Color "${trimmedName}" already exists in the database. Please use a different name or select it from existing colors below.`);
      return;
    }
    
    // Add new color
    setColors([...colors, { id: Date.now(), name: trimmedName, hex_code: newColorHex }]);
    setNewColorName('');
    setError(null);
  };

  const handleSelectExistingColor = (existingColor: ExistingColor) => {
    // Check if color already exists in current selection
    if (colors.find(c => c.name.toLowerCase() === existingColor.name.toLowerCase())) {
      setError(`Color "${existingColor.name}" is already added to this product.`);
      return;
    }
    
    // Add existing color to selection
    setColors([...colors, { id: Date.now(), name: existingColor.name, hex_code: existingColor.hex_code }]);
    setError(null);
  };

  const handleRemoveColor = (idToRemove: number) => {
    setColors(colors.filter(color => color.id !== idToRemove));
    // Remove any variants that use this color
    setVariants(variants.filter(variant => variant.colorId !== idToRemove));
  };

  // --- Handlers for Sizes ---
  const handleAddSize = () => {
    if (!newSizeName.trim()) return;
    
    const trimmedName = newSizeName.trim().toUpperCase();
    
    // Check if size already exists
    if (sizes.find(s => s.name === trimmedName)) {
      setError(`Size "${trimmedName}" already exists.`);
      return;
    }
    
    setSizes([...sizes, { id: Date.now(), name: trimmedName }]);
    setNewSizeName('');
    setError(null);
  };

  const handleRemoveSize = (idToRemove: number) => {
    setSizes(sizes.filter(size => size.id !== idToRemove));
    // Remove any variants that use this size
    setVariants(variants.filter(variant => variant.sizeId !== idToRemove));
  };

  // --- Handlers for Images ---
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map(file => ({
        id: Date.now() + Math.random(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImages(prevImages => [...prevImages, ...filesArray]);
    }
  };

  const handleRemoveImage = (idToRemove: number) => {
    const imageToRemove = images.find(img => img.id === idToRemove);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
      setImages(images.filter(img => img.id !== idToRemove));
      // Remove any variants that use this image
      setVariants(variants.filter(variant => variant.imageId !== idToRemove));
    }
  };

  // --- Handlers for Variants ---
  const handleAddVariant = () => {
    if (images.length === 0 || colors.length === 0 || sizes.length === 0) {
      setError('Please add at least one image, color, and size before creating variants.');
      return;
    }
    
    const newVariant: ProductVariant = {
      id: Date.now(),
      imageId: images[0].id,
      colorId: colors[0].id,
      sizeId: sizes[0].id,
      stock: 0
    };
    
    setVariants([...variants, newVariant]);
    setError(null);
  };

  const handleUpdateVariant = (variantId: number, field: keyof ProductVariant, value: number) => {
    setVariants(variants.map(variant => 
      variant.id === variantId ? { ...variant, [field]: value } : variant
    ));
  };

  const handleRemoveVariant = (idToRemove: number) => {
    setVariants(variants.filter(variant => variant.id !== idToRemove));
  };

  // --- Audio Handler ---
  const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    if (!name || !price || variants.length === 0) {
      setError('Please fill in Name, Price, and create at least one product variant.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    if (salePrice) formData.append('salePrice', salePrice);

    // Send colors, sizes, images, and variants data
    formData.append('colors', JSON.stringify(colors.map(({name, hex_code}) => ({name, hex_code}))));
    formData.append('sizes', JSON.stringify(sizes.map(({name}) => ({name}))));
    formData.append('variants', JSON.stringify(variants));

    // Append image files
    images.forEach((image, index) => {
      formData.append('images', image.file);
      formData.append(`imageId_${index}`, String(image.id));
    });
    
    // Append audio file if it exists
    if (audioFile) {
      formData.append('audioFile', audioFile);
    }
    
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      router.push('/admin/products');
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImageById = (id: number) => images.find(img => img.id === id);
  const getColorById = (id: number) => colors.find(color => color.id === id);
  const getSizeById = (id: number) => sizes.find(size => size.id === id);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Add New Product</h1>
          <p className="mt-1 text-gray-500">Create product variants by linking images, colors, sizes, and stock levels.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={20} />}
            <span>{isSubmitting ? 'Saving...' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      {error && <div className="p-4 text-red-800 bg-red-100 border-l-4 border-red-500 rounded-md" role="alert">{error}</div>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Main Details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Product Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" required />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={5} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"></textarea>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Pricing</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label>
                <input type="number" id="price" value={price} onChange={e => setPrice(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" required min="0" step="0.01" />
              </div>
              <div>
                <label htmlFor="sale-price" className="block text-sm font-medium text-gray-700">Sale Price ($)</label>
                <input type="number" id="sale-price" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" min="0" step="0.01" />
              </div>
            </div>
          </div>

          {/* Audio Upload */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Product Page Audio (Optional)</h2>
            <div className="mt-4">
              <label htmlFor="audio-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none">
                <Music className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">Click to upload audio</span>
                <span className="text-xs text-gray-500">MP3, WAV, OGG up to 10MB</span>
                <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
              </label>
            </div>
            {audioFile && (
              <div className="flex items-center justify-between p-3 mt-4 text-sm rounded-md bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">{audioFile.name}</span>
                </div>
                <button type="button" onClick={() => setAudioFile(null)} className="p-1 rounded-full hover:bg-red-100">
                  <X size={16} className="text-red-600" />
                </button>
              </div>
            )}
          </div>

          {/* Product Variants Table */}
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Product Variants</h2>
              <button type="button" onClick={handleAddVariant} className="flex items-center gap-2 px-3 py-2 text-sm text-white rounded-md bg-primary hover:bg-primary/90">
                <Plus size={16} />
                Add Variant
              </button>
            </div>
            
            {variants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Image</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Color</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Size</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {variants.map(variant => {
                      const image = getImageById(variant.imageId);
                      const color = getColorById(variant.colorId);
                      const size = getSizeById(variant.sizeId);
                      
                      return (
                        <tr key={variant.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="relative w-16 h-16">
                                {image && (
                                  <Image src={image.previewUrl} alt="Variant" fill className="object-cover rounded-md" />
                                )}
                              </div>
                              <select 
                                value={variant.imageId} 
                                onChange={e => handleUpdateVariant(variant.id, 'imageId', Number(e.target.value))}
                                className="ml-2 text-sm border-gray-300 rounded-md focus:border-primary focus:ring-primary"
                              >
                                {images.map(img => (
                                  <option key={img.id} value={img.id}>Image {images.indexOf(img) + 1}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {color && (
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 border rounded-full" style={{backgroundColor: color.hex_code}}></span>
                                  <span className="text-sm">{color.name}</span>
                                </div>
                              )}
                              <select 
                                value={variant.colorId} 
                                onChange={e => handleUpdateVariant(variant.id, 'colorId', Number(e.target.value))}
                                className="ml-2 text-sm border-gray-300 rounded-md focus:border-primary focus:ring-primary"
                              >
                                {colors.map(color => (
                                  <option key={color.id} value={color.id}>{color.name}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select 
                              value={variant.sizeId} 
                              onChange={e => handleUpdateVariant(variant.id, 'sizeId', Number(e.target.value))}
                              className="text-sm border-gray-300 rounded-md focus:border-primary focus:ring-primary"
                            >
                              {sizes.map(size => (
                                <option key={size.id} value={size.id}>{size.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={e => handleUpdateVariant(variant.id, 'stock', Number(e.target.value))}
                              className="w-20 text-sm border-gray-300 rounded-md focus:border-primary focus:ring-primary"
                              min="0"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(variant.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No variants created yet. Add images, colors, and sizes first, then create variants.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assets */}
        <div className="space-y-6 lg:col-span-1">
          {/* Images */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Images</h2>
            <div className="mt-4">
              <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none">
                <UploadCloud className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">Click to upload</span>
                <span className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</span>
                <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {images.map((image) => (
                  <div key={image.id} className="relative group aspect-square">
                    <Image src={image.previewUrl} alt="Product preview" fill className="object-cover rounded-md" />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveImage(image.id)} 
                      className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-2 right-2 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Colors</h2>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="e.g., Midnight Blue" value={newColorName} onChange={e => setNewColorName(e.target.value)} className="flex-grow text-sm border-gray-300 rounded-md focus:border-primary focus:ring-primary"/>
                <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="w-10 h-10 p-1 border-gray-300 rounded-md cursor-pointer" />
                <button type="button" onClick={handleAddColor} className="p-2 text-white rounded-md bg-primary hover:bg-primary/90"><Plus size={16} /></button>
              </div>
              
              {colors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {colors.map(color => (
                    <div key={color.id} className="flex items-center gap-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                      <span className="block w-3 h-3 border border-gray-300 rounded-full" style={{ backgroundColor: color.hex_code }}></span>
                      {color.name}
                      <button type="button" onClick={() => handleRemoveColor(color.id)}>
                        <X size={12} className="text-gray-500 hover:text-red-600"/>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existingColors.length > 0 && (
                <div className="p-3 mt-4 rounded-md bg-gray-50">
                  <label className="block mb-2 text-xs font-medium text-gray-700">Select from Existing</label>
                  <div className="grid grid-cols-1 gap-1 overflow-y-auto max-h-32">
                    {existingColors.map((existingColor, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectExistingColor(existingColor)}
                        className="flex items-center gap-2 p-2 text-xs text-left transition-colors border border-gray-200 rounded hover:bg-white"
                      >
                        <span className="block w-3 h-3 border border-gray-300 rounded-full" style={{ backgroundColor: existingColor.hex_code }}></span>
                        <span className="truncate">{existingColor.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sizes */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Sizes</h2>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="e.g., M" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} className="flex-grow text-sm border-gray-300 rounded-md focus:border-primary focus:ring-primary"/>
                <button type="button" onClick={handleAddSize} className="p-2 text-white rounded-md bg-primary hover:bg-primary/90"><Plus size={16} /></button>
              </div>
              {sizes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {sizes.map(size => (
                    <div key={size.id} className="flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 rounded-full">
                      {size.name}
                      <button type="button" onClick={() => handleRemoveSize(size.id)}>
                        <X size={12} className="text-gray-500 hover:text-red-600"/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
