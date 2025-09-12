"use client";

import { useState, useEffect, FormEvent, ChangeEvent, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, X, UploadCloud, Plus, Trash2, Edit, FileAudio, Music } from 'lucide-react';

// Define the shapes of our data
interface Color {
  id: number;
  name: string;
  hex_code: string;
}

interface Size {
  id: number;
  name: string;
}

interface ImageFile {
  id?: number;         // Real DB ID for existing images
  file?: File;         // The File object for new uploads
  previewUrl: string;  // Local preview URL or existing DB URL
  colorId: string;     // Can be linked to a color's ID
}

// Data shape for the product fetched from the API
interface ProductData {
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  audioUrl?: string | null;
  colors: Color[];
  sizes: Size[];
  images: { id: number; url: string; colorId: number | null }[];
  stock: { [sizeName: string]: number };
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  // Control states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [stock, setStock] = useState<{ [sizeName: string]: string }>({});
  const [images, setImages] = useState<ImageFile[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]); // Track IDs of images to delete

  // NEW: Audio file state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  // NEW: Color management state
  const [isEditingColors, setIsEditingColors] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  const [colorError, setColorError] = useState('');

  // NEW: Size management state
  const [isEditingSizes, setIsEditingSizes] = useState(false);
  const [newSizeName, setNewSizeName] = useState('');
  const [availableSizes, setAvailableSizes] = useState<Size[]>([]);
  const [sizeError, setSizeError] = useState('');

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}`);
        if (!res.ok) throw new Error('Failed to fetch product data.');
        
        const product: ProductData = await res.json();
        
        // Populate all state variables with fetched data
        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.price));
        setSalePrice(product.salePrice ? String(product.salePrice) : '');
        setCurrentAudioUrl(product.audioUrl || null);
        setColors(product.colors);
        setSizes(product.sizes);
        setImages(product.images.map(img => ({
          id: img.id,
          previewUrl: img.url,
          colorId: String(img.colorId || ''),
        })));

        // Convert the stock object values to strings for the form inputs
        const stockForForm = Object.entries(product.stock).reduce((acc, [sizeName, stockValue]) => {
          acc[sizeName] = String(stockValue);
          return acc;
        }, {} as { [key: string]: string });
        setStock(stockForForm);

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load product';
        setError(errorMessage);
      } finally {
        setInitialLoading(false);
      }
    };

    const fetchAvailableColors = async () => {
      try {
        const res = await fetch('/api/admin/colors');
        if (res.ok) {
          const data = await res.json();
          setAvailableColors(data.colors || []);
        }
      } catch (err) {
        console.error('Failed to fetch available colors:', err);
      }
    };

    const fetchAvailableSizes = async () => {
      try {
        const res = await fetch('/api/admin/sizes');
        if (res.ok) {
          const data = await res.json();
          setAvailableSizes(data.sizes || []);
        }
      } catch (err) {
        console.error('Failed to fetch available sizes:', err);
      }
    };

    fetchProductData();
    fetchAvailableColors();
    fetchAvailableSizes();
  }, [productId]);

  // --- Handlers (similar to New page, but adapted) ---

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        colorId: '',
      }));
      setImages(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const imageToRemove = images[indexToRemove];
    // If it's an existing image from the DB, add its ID to the deletion queue
    if (imageToRemove.id) {
      setImagesToDelete(prev => [...prev, imageToRemove.id!]);
    }
    // If it's a newly added image, revoke its temporary URL
    if(imageToRemove.file) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleImageColorLink = (indexToUpdate: number, colorId: string) => {
    setImages(prev => prev.map((img, index) => 
      index === indexToUpdate ? { ...img, colorId } : img
    ));
  };

  const handleStockChange = (sizeName: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    setStock(prevStock => ({ ...prevStock, [sizeName]: sanitizedValue }));
  };

  // Audio file handler
  const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  // Color management functions
  const handleAddNewColor = async () => {
    if (!newColorName.trim()) {
      setColorError('Color name is required');
      return;
    }

    const trimmedName = newColorName.trim();
    console.log('Trying to add color:', trimmedName, 'with hex:', newColorHex);
    console.log('Available colors:', availableColors);
    console.log('Current product colors:', colors);
    
    // Check if color already exists in current colors (by name or hex)
    const existingByName = colors.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    const existingByHex = colors.find(c => c.hex_code.toLowerCase() === newColorHex.toLowerCase());
    
    if (existingByName) {
      setColorError(`Color "${trimmedName}" already exists for this product`);
      return;
    }
    
    if (existingByHex) {
      setColorError(`This hex code "${newColorHex}" is already used by color "${existingByHex.name}" in this product`);
      return;
    }

    try {
      // Check if color exists in global colors first (by name)
      const existingColorByName = availableColors.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
      
      if (existingColorByName) {
        // Use existing color (even if hex is different)
        console.log('Using existing color by name:', existingColorByName);
        setColors([...colors, existingColorByName]);
        setNewColorName('');
        setNewColorHex('#000000');
        setColorError('');
        return;
      }

      // Check if hex code exists in global colors
      const existingColorByHex = availableColors.find(c => c.hex_code.toLowerCase() === newColorHex.toLowerCase());
      
      if (existingColorByHex) {
        // Show user the existing color with this hex code and offer to use it
        setColorError(`Hex code "${newColorHex}" already exists as "${existingColorByHex.name}". Use the "Add Existing Color" dropdown to select it, or choose a different hex code.`);
        return;
      }

      console.log('Creating new color');
      // Create new color
      const response = await fetch('/api/admin/colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          hex_code: newColorHex
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create color');
      }

      const newColor = await response.json();
      setColors([...colors, newColor]);
      setAvailableColors([...availableColors, newColor]);
      setNewColorName('');
      setNewColorHex('#000000');
      setColorError('');
    } catch (error) {
      setColorError(error instanceof Error ? error.message : 'Failed to add color');
    }
  };

  const handleDeleteColor = (colorId: number) => {
    if (colors.length <= 1) {
      setColorError('Product must have at least one color');
      return;
    }
    setColors(colors.filter(c => c.id !== colorId));
    setColorError('');
  };

  const handleSelectExistingColor = (colorId: number) => {
    const existingColor = availableColors.find(c => c.id === colorId);
    if (existingColor && !colors.find(c => c.id === colorId)) {
      setColors([...colors, existingColor]);
    }
  };

  // Size management functions
  const handleAddNewSize = async () => {
    if (!newSizeName.trim()) {
      setSizeError('Size name is required');
      return;
    }

    const trimmedName = newSizeName.trim();
    
    // Check if size already exists in current sizes
    if (sizes.find(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      setSizeError(`Size "${trimmedName}" already exists for this product`);
      return;
    }

    try {
      // Check if size exists in global sizes first
      const existingSize = availableSizes.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
      
      if (existingSize) {
        // Use existing size
        setSizes([...sizes, existingSize]);
        setStock({ ...stock, [existingSize.name]: '0' });
        setNewSizeName('');
        setSizeError('');
        return;
      }

      // Create new size
      const response = await fetch('/api/admin/sizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create size');
      }

      const newSize = await response.json();
      setSizes([...sizes, newSize]);
      setAvailableSizes([...availableSizes, newSize]);
      setStock({ ...stock, [newSize.name]: '0' });
      setNewSizeName('');
      setSizeError('');
    } catch (error) {
      setSizeError(error instanceof Error ? error.message : 'Failed to add size');
    }
  };

  const handleDeleteSize = (sizeId: number) => {
    const sizeToDelete = sizes.find(s => s.id === sizeId);
    if (!sizeToDelete) return;
    
    setSizes(sizes.filter(s => s.id !== sizeId));
    
    // Remove stock entry for this size
    const newStock = { ...stock };
    delete newStock[sizeToDelete.name];
    setStock(newStock);
    setSizeError('');
  };

  const handleSelectExistingSize = (sizeId: number) => {
    const existingSize = availableSizes.find(s => s.id === sizeId);
    if (existingSize && !sizes.find(s => s.id === sizeId)) {
      setSizes([...sizes, existingSize]);
      setStock({ ...stock, [existingSize.name]: '0' });
    }
  };

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    // Append standard fields
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('salePrice', salePrice);

    // Append relational data as JSON
    formData.append('colors', JSON.stringify(colors));
    formData.append('sizes', JSON.stringify(sizes));
    formData.append('stock', JSON.stringify(stock));
    formData.append('imagesToDelete', JSON.stringify(imagesToDelete));

    // NEW: Append audio file if selected
    if (audioFile) {
      formData.append('audioFile', audioFile);
    }

    // Separate new images from existing ones
    const newImages = images.filter(img => img.file);
    const existingImages = images.filter(img => !img.file);

    // Append metadata for existing images (in case their color link changed)
    formData.append('existingImages', JSON.stringify(existingImages));
    
    // Append new image files and their metadata
    const newImageMetadata = newImages.map(img => ({
        originalName: img.file!.name,
        colorId: img.colorId ? parseInt(img.colorId) : null,
    }));
    formData.append('newImageMetadata', JSON.stringify(newImageMetadata));
    newImages.forEach(img => {
        formData.append('newImages', img.file!);
    });

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH', // Use PATCH for updates
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      router.push('/admin/products');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (initialLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  
  if (error && initialLoading) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  // JSX is identical to the NewProductPage, but wired to the state of this component
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="mt-1 text-gray-500">Update the details for this product below.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && <div className="p-4 text-red-800 bg-red-100 border-l-4 border-red-500 rounded-md" role="alert">{error}</div>}
      
      {/* Form layout (copied from NewProductPage) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column */}
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
            <h2 className="text-xl font-semibold">Images</h2>
            <div className="mt-4">
              <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none">
                <UploadCloud className="w-8 h-8 text-gray-400" />
                <span>Click to upload new images</span>
                <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6 sm:grid-cols-3 md:grid-cols-4">
                {images.map((image, index) => (
                  <div key={image.previewUrl} className="relative group aspect-square">
                    <Image src={image.previewUrl} alt="Product preview" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover rounded-md" />
                    <div className="absolute inset-0 flex flex-col justify-between p-2 transition-opacity opacity-0 bg-black/60 group-hover:opacity-100">
                      <button type="button" onClick={() => handleRemoveImage(index)} className="self-end p-1 rounded-full bg-white/80 hover:bg-white"><X size={16} className="text-red-600" /></button>
                      <select value={image.colorId} onChange={e => handleImageColorLink(index, e.target.value)} className="w-full text-xs border-gray-300 rounded-md shadow-sm">
                        <option value="">General</option>
                        {colors.map(color => (<option key={color.id} value={String(color.id)}>{color.name}</option>))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NEW: Audio Upload Section */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Audio</h2>
            <p className="mt-1 text-sm text-gray-500">Upload an audio file for this product (optional)</p>
            
            {/* Current Audio Display */}
            {currentAudioUrl && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Current Audio</p>
                    <audio controls className="mt-2 w-full max-w-sm">
                      <source src={currentAudioUrl} type="audio/mpeg" />
                      <source src={currentAudioUrl} type="audio/wav" />
                      <source src={currentAudioUrl} type="audio/ogg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Upload */}
            <div className="mt-4">
              <label htmlFor="audio-upload" className="flex flex-col items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none">
                <FileAudio className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {audioFile ? audioFile.name : (currentAudioUrl ? 'Click to replace audio file' : 'Click to upload audio file')}
                </span>
                <span className="text-xs text-gray-400 mt-1">MP3, WAV, OGG files supported</span>
                <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
              </label>
            </div>

            {/* Audio Preview for New Upload */}
            {audioFile && (
              <div className="mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <FileAudio className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">New Audio File</p>
                    <p className="text-sm text-green-700">{audioFile.name}</p>
                    <p className="text-xs text-green-600">This will replace the current audio when you save</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Pricing</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label>
                <input type="number" id="price" value={price} onChange={e => setPrice(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" required min="0" step="0.01" />
              </div>
              <div>
                <label htmlFor="sale-price" className="block text-sm font-medium text-gray-700">Sale Price ($) <span className="text-gray-400">(Optional)</span></label>
                <input type="number" id="sale-price" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" min="0" step="0.01" />
              </div>
            </div>
          </div>
          
          {/* In a real app, you would fetch all available colors/sizes and let the user select from them */}
          {/* For simplicity, we manage the existing ones */}
          <div className="p-6 bg-white rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Variants</h2>
                <button
                  type="button"
                  onClick={() => setIsEditingColors(!isEditingColors)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-primary transition-colors"
                >
                  <Edit size={14} />
                  {isEditingColors ? 'Done Editing' : 'Edit Colors'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">Manage colors, sizes, and inventory stock.</p>
              
              {/* Colors Management */}
              <div className="mt-4">
                <h3 className="font-medium text-gray-900">Colors</h3>
                
                {!isEditingColors ? (
                  // Display mode
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colors.map(color => (
                      <div key={color.id} className="flex items-center gap-2 px-2 py-1 text-sm bg-gray-100 rounded-full">
                        <span className="block w-3 h-3 border rounded-full" style={{ backgroundColor: color.hex_code }}></span>
                        {color.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Edit mode
                  <div className="space-y-4 mt-2">
                    {/* Current Colors */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Current Colors</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {colors.map(color => (
                          <div key={color.id} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
                            <span className="block w-4 h-4 border rounded-full" style={{ backgroundColor: color.hex_code }}></span>
                            <span className="text-sm">{color.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteColor(color.id)}
                              className="text-red-500 hover:text-red-700"
                              disabled={colors.length <= 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Existing Color */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Add Existing Color</label>
                      <select
                        onChange={(e) => e.target.value && handleSelectExistingColor(parseInt(e.target.value))}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
                        value=""
                      >
                        <option value="">Select an existing color...</option>
                        {availableColors
                          .filter(ac => !colors.find(c => c.id === ac.id))
                          .map(color => (
                            <option key={color.id} value={color.id}>
                              {color.name} ({color.hex_code})
                            </option>
                          ))}
                      </select>
                      
                      {/* Debug info */}
                      <div className="mt-2 p-2 bg-gray-100 text-xs">
                        <div>Total available colors: {availableColors.length}</div>
                        <div>Current product colors: {colors.length}</div>
                        <div>Available to add: {availableColors.filter(ac => !colors.find(c => c.id === ac.id)).length}</div>
                        <div className="mt-1">
                          Available colors: {availableColors.map(c => `${c.name}(${c.hex_code})`).join(', ')}
                        </div>
                        <div className="mt-1">
                          Current colors: {colors.map(c => `${c.name}(${c.hex_code})`).join(', ')}
                        </div>
                      </div>
                    </div>

                    {/* Add New Color */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Add New Color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="Color name"
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
                        />
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewColor}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                      {colorError && (
                        <p className="mt-1 text-sm text-red-600">{colorError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sizes Management */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Sizes</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingSizes(!isEditingSizes)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-primary transition-colors"
                  >
                    <Edit size={14} />
                    {isEditingSizes ? 'Done Editing' : 'Edit Sizes'}
                  </button>
                </div>

                {!isEditingSizes ? (
                  // Display mode
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sizes.map(size => (
                      <div key={size.id} className="px-3 py-1 text-sm bg-gray-100 rounded-full">
                        {size.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Edit mode
                  <div className="space-y-4 mt-2">
                    {/* Current Sizes */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Current Sizes</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sizes.map(size => (
                          <div key={size.id} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
                            <span className="text-sm">{size.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSize(size.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Existing Size */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Add Existing Size</label>
                      <select
                        onChange={(e) => e.target.value && handleSelectExistingSize(parseInt(e.target.value))}
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
                        value=""
                      >
                        <option value="">Select an existing size...</option>
                        {availableSizes
                          .filter(as => !sizes.find(s => s.id === as.id))
                          .map(size => (
                            <option key={size.id} value={size.id}>
                              {size.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Add New Size */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Add New Size</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="Size name (e.g., S, M, L, XL)"
                          value={newSizeName}
                          onChange={(e) => setNewSizeName(e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewSize}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                      {sizeError && (
                        <p className="mt-1 text-sm text-red-600">{sizeError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {sizes.length > 0 && (
                  <div className="pt-4 mt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 text-md">Inventory Stock</h3>
                  <div className="mt-2 space-y-3">
                      {sizes.map(size => (
                          <div key={size.id} className="grid items-center grid-cols-3 gap-2">
                          <label htmlFor={`stock-${size.name}`} className="col-span-1 text-sm font-medium text-gray-700">{size.name}</label>
                          <input type="number" id={`stock-${size.name}`} value={stock[size.name] || ''} onChange={(e) => handleStockChange(size.name, e.target.value)} className="w-full col-span-2 border-gray-300 rounded-md shadow-sm" min="0" placeholder='0'/>
                          </div>
                      ))}
                  </div>
                  </div>
              )}
          </div>
        </div>
      </div>
    </form>
  );
}