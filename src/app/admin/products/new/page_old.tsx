"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Plus, X, UploadCloud, Music, FileAudio, Trash2 } from 'lucide-react';

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
    setNewColorName(''); // Reset input after adding
    setError(null); // Clear any previous errors
  };

  const handleSelectExistingColor = (existingColor: ExistingColor) => {
    // Check if color already exists in current selection
    if (colors.find(c => c.name.toLowerCase() === existingColor.name.toLowerCase())) {
      setError(`Color "${existingColor.name}" is already added to this product.`);
      return;
    }
    
    // Add existing color to selection
    setColors([...colors, { id: Date.now(), name: existingColor.name, hex_code: existingColor.hex_code }]);
    setError(null); // Clear any previous errors
  };

  const handleRemoveColor = (idToRemove: number) => {
    setColors(colors.filter(color => color.id !== idToRemove));
    // When a color is removed, reset any images linked to it back to 'General'
    setImages(images.map(img => img.colorId === String(idToRemove) ? { ...img, colorId: '' } : img));
  };
  
  // --- Handlers for Sizes & Stock ---
  const handleAddSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim().toUpperCase())) {
      const formattedSize = newSize.trim().toUpperCase();
      const updatedSizes = [...sizes, formattedSize];
      setSizes(updatedSizes);
      // Initialize stock for the new size
      setStock(prevStock => ({...prevStock, [formattedSize]: '0'}));
      setNewSize(''); // Reset input
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    setSizes(sizes.filter(size => size !== sizeToRemove));
    const newStock = { ...stock };
    delete newStock[sizeToRemove];
    setStock(newStock);
  };
  
  const handleStockChange = (size: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    setStock(prevStock => ({ ...prevStock, [size]: sanitizedValue }));
  };

  // --- Handlers for Images ---
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        colorId: '', // Default to 'General' (no color link)
      }));
      setImages(prevImages => [...prevImages, ...filesArray]);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setImages(images.filter(img => img.previewUrl !== urlToRemove));
    URL.revokeObjectURL(urlToRemove); // Important for memory management
  };

  const handleImageColorLink = (urlToUpdate: string, colorId: string) => {
    setImages(images.map(img => img.previewUrl === urlToUpdate ? { ...img, colorId } : img));
  };

  // NEW: Handler for audio file selection
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
    
    if (!name || !price || images.length === 0 || sizes.length === 0 || colors.length === 0) {
      setError('Please fill in Name, Price, and add at least one Color, Size, and Image.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    if (salePrice) formData.append('salePrice', salePrice);

    const finalColors = colors.map(({name, hex_code}) => ({name, hex_code}));
    formData.append('colors', JSON.stringify(finalColors));
    formData.append('sizes', JSON.stringify(sizes));
    formData.append('stock', JSON.stringify(stock));

    const imageMetadata = images.map(img => {
        const linkedColor = colors.find(c => String(c.id) === img.colorId);
        return {
            originalName: img.file.name,
            linkedColorName: linkedColor ? linkedColor.name : null
        };
    });
    formData.append('imageMetadata', JSON.stringify(imageMetadata));

    images.forEach(image => {
        formData.append('images', image.file);
    });
    
    // NEW: Append audio file if it exists
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

      // On success, redirect to the products page
      router.push('/admin/products');
      // Optionally, you could show a success toast message here instead of an alert
      // For example: toast.success('Product created successfully!');
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Add New Product</h1>
          <p className="mt-1 text-gray-500">Fill in the details to add a new product to your store.</p>
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
            <h2 className="text-xl font-semibold">Images</h2>
            <div className="mt-4">
              <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none">
                <UploadCloud className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">Click to upload or <span className="text-primary">drag and drop</span></span>
                <span className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</span>
                <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6 sm:grid-cols-3 md:grid-cols-4">
                {images.map((image) => (
                  <div key={image.previewUrl} className="relative group aspect-square">
                    <Image src={image.previewUrl} alt="Product preview" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover rounded-md" />
                    <div className="absolute inset-0 flex flex-col justify-between p-2 transition-opacity duration-300 opacity-0 bg-black/60 group-hover:opacity-100">
                      <button type="button" onClick={() => handleRemoveImage(image.previewUrl)} className="self-end p-1 transition rounded-full bg-white/80 hover:bg-white hover:scale-110" aria-label="Remove image">
                        <X size={16} className="text-red-600" />
                      </button>
                      <select value={image.colorId} onChange={e => handleImageColorLink(image.previewUrl, e.target.value)} className="w-full text-xs border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" aria-label="Link image to color">
                        <option value="">General / Default Image</option>
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
        </div>

        {/* Right Column: Pricing & Variants */}
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Pricing</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label>
                <input type="number" id="price" value={price} onChange={e => setPrice(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" required min="0" step="0.01" />
              </div>
              <div>
                <label htmlFor="sale-price" className="block text-sm font-medium text-gray-700">Sale Price ($) <span className="text-gray-400">(Optional)</span></label>
                <input type="number" id="sale-price" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" min="0" step="0.01" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Variants</h2>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Add New Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="text" placeholder="e.g., Midnight Blue" value={newColorName} onChange={e => setNewColorName(e.target.value)} className="flex-grow border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"/>
                <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="w-10 h-10 p-1 border-gray-300 rounded-md shadow-sm cursor-pointer" />
                <button type="button" onClick={handleAddColor} className="p-2 text-white rounded-md bg-primary hover:bg-primary/90"><Plus size={20} /></button>
              </div>
              
              {/* Selected Colors */}
              <div className="flex flex-wrap gap-2 mt-3">
                {colors.map(color => (<div key={color.id} className="flex items-center gap-2 px-2 py-1 text-sm bg-gray-100 rounded-full"><span className="block w-3 h-3 border border-gray-300 rounded-full" style={{ backgroundColor: color.hex_code }}></span>{color.name}<button type="button" onClick={() => handleRemoveColor(color.id)}><X size={14} className="text-gray-500 hover:text-red-600"/></button></div>))}
              </div>

              {/* Existing Colors Section */}
              {existingColors.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or Select from Existing Colors</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {existingColors.map((existingColor, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectExistingColor(existingColor)}
                        className="flex items-center gap-2 p-2 text-xs border border-gray-200 rounded-md hover:bg-white hover:border-primary transition-colors text-left"
                      >
                        <span 
                          className="block w-3 h-3 border border-gray-300 rounded-full" 
                          style={{ backgroundColor: existingColor.hex_code }}
                        ></span>
                        <span className="truncate">{existingColor.name}</span>
                        {existingColor.source === 'global' && (
                          <span className="text-xs text-blue-600">★</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">★ = Global colors available across all products</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Sizes</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="text" placeholder="e.g., M" value={newSize} onChange={e => setNewSize(e.target.value)} className="flex-grow border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"/>
                <button type="button" onClick={handleAddSize} className="p-2 text-white rounded-md bg-primary hover:bg-primary/90"><Plus size={20} /></button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {sizes.map(size => (<div key={size} className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 rounded-full">{size}<button type="button" onClick={() => handleRemoveSize(size)}><X size={14} className="text-gray-500 hover:text-red-600"/></button></div>))}
              </div>
            </div>

            {sizes.length > 0 && (<div className="pt-4 mt-6 border-t border-gray-200"><h3 className="font-medium text-gray-900 text-md">Inventory Stock</h3><div className="mt-2 space-y-3">{sizes.map(size => (<div key={size} className="grid items-center grid-cols-3 gap-2"><label htmlFor={`stock-${size}`} className="col-span-1 text-sm font-medium text-gray-700">{size}</label><input type="number" id={`stock-${size}`} value={stock[size] || ''} onChange={(e) => handleStockChange(size, e.target.value)} className="w-full col-span-2 border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary" min="0" placeholder='0'/></div>))}</div></div>)}
          </div>
        </div>
      </div>
    </form>
  );
}