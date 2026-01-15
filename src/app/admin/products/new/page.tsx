"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  Star, 
  CheckCircle, 
  UploadCloud,
  ArrowLeft,
  Music,
  CreditCard,
  Video,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useObjectUrl } from '@/lib/hooks/useObjectUrl';

// --- MODAL COMPONENTS ---
const SavingOverlay = ({ isVisible, progress, message }: { isVisible: boolean; progress: number; message: string }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md p-8 mx-4 text-center bg-white shadow-2xl rounded-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 rounded-full border-t-primary animate-spin"></div>
          </div>
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900">Saving Product</h2>
        <p className="mb-6 text-sm text-slate-500">{message}</p>
        <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
          <div 
            className="h-full transition-all duration-300 ease-out rounded-full bg-gradient-to-r from-primary to-blue-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">{progress}%</p>
        <p className="mt-4 text-xs text-slate-400">Please do not close this page</p>
      </div>
    </div>
  );
};

const ErrorModal = ({ isVisible, title, message, onClose }: { isVisible: boolean; title: string; message: string; onClose: () => void }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 mx-4 bg-white shadow-2xl rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 bg-red-100 rounded-full">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// --- TYPE DEFINITIONS ---
type ExistingColor = { colorName: string; colorHex: string };
type SizeStock = { size: string; stock: number };
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'm4v'];
// Reduced limits to work with common VPS/Nginx defaults
const MAX_TOTAL_UPLOAD_BYTES = 50 * 1024 * 1024;  // 50MB total (safe for most VPS)
const MAX_FILE_UPLOAD_BYTES = 25 * 1024 * 1024;   // 25MB per file
const MAX_TOTAL_UPLOAD_MB = MAX_TOTAL_UPLOAD_BYTES / (1024 * 1024);
const MAX_FILE_UPLOAD_MB = MAX_FILE_UPLOAD_BYTES / (1024 * 1024);

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

const isVideoFile = (file: File) => {
  if (file.type) {
    return file.type.startsWith('video/');
  }
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? VIDEO_EXTENSIONS.includes(extension) : false;
};

type ProductVariant = {
  id: number; // Temporary client-side ID
  colorName: string;
  colorHex: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  variantMedia: File[]; // Color-specific media files (images/videos)  
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

const VariantMediaPreview = ({
  variantId,
  file,
  isThumbnail,
  onSelectThumbnail,
  onRemove,
}: {
  variantId: number;
  file: File;
  isThumbnail: boolean;
  onSelectThumbnail: (variantId: number, imageName: string) => void;
  onRemove: (variantId: number, file: File) => void;
}) => {
  const previewUrl = useObjectUrl(file);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset states when file changes
  useEffect(() => {
    setImageLoaded(false);
  }, [file]);

  // Show loading state while blob URL is being created
  if (!previewUrl) {
    return (
      <div className="relative flex items-center justify-center overflow-hidden border rounded-lg border-slate-200 bg-slate-100 aspect-square animate-pulse">
        <ImageIcon size={24} className="text-slate-400" />
      </div>
    );
  }

  // Blob URLs are local - they always work, no need for error state
  const isVideo = isVideoFile(file);

  return (
    <div className="relative overflow-hidden border rounded-lg group border-slate-200 bg-slate-50 aspect-square">
      {/* Loading overlay - brief flash while image loads from local blob */}
      {!imageLoaded && !isVideo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <ImageIcon size={24} className="text-slate-400" />
        </div>
      )}
      {isVideo ? (
        <video
          src={previewUrl}
          className="object-cover w-full h-full"
          muted
          controls={false}
          playsInline
          loop
          onLoadedData={() => setImageLoaded(true)}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- Use native img for blob URLs */
        <img
          src={previewUrl}
          alt="upload preview"
          className="object-cover w-full h-full"
          onLoad={() => setImageLoaded(true)}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-1 transition-opacity rounded-lg opacity-0 bg-black/60 group-hover:opacity-100">
        <button
          type="button"
          title="Set as thumbnail"
          onClick={() => onSelectThumbnail(variantId, file.name)}
          className="p-1.5 text-white rounded-full bg-black/60 hover:bg-primary"
        >
          <Star size={14} fill={isThumbnail ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          title="Remove file"
          onClick={() => onRemove(variantId, file)}
          className="p-1.5 text-white rounded-full bg-black/60 hover:bg-red-600"
        >
          <X size={14} />
        </button>
      </div>
      {isVideo && (
        <div className="absolute top-1 left-1 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
          <Video size={12} />
          Video
        </div>
      )}
      {isThumbnail && (
        <div className="absolute p-1 bg-white rounded-full shadow top-1 right-1">
          <Star size={10} className="text-primary" fill="currentColor" />
        </div>
      )}
    </div>
  );
};

// Minimal rich text editor to support basic formatting
const RichTextEditor = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const applyFormat = (command: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
    handleInput();
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            applyFormat('bold');
          }}
          className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200"
        >
          Bold
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            applyFormat('insertUnorderedList');
          }}
          className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200"
        >
          Bullet List
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            applyFormat('insertParagraph');
          }}
          className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200"
        >
          Line Break
        </button>
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          onPaste={handlePaste}
          className="min-h-[160px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-slate-900"
        />
        {!value?.replace(/<br\s*\/?>|&nbsp;|\s/g, '').trim() && (
          <span className="absolute text-sm text-slate-400 pointer-events-none left-4 top-3">
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
};


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
      variantMedia: [], 
      sizes: [{ size: 'One Size', stock: 0 }], 
      thumbnailImageName: null
    }
  ]);
  const [activeVariantId, setActiveVariantId] = useState<number | null>(variants[0]?.id || null);

  // --- API & LOADING STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveMessage, setSaveMessage] = useState('Preparing...');
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [existingColors, setExistingColors] = useState<ExistingColor[]>([]);

  const tradingCardPreviewUrl = useObjectUrl(tradingImage);

  // Fetch existing colors from API
  useEffect(() => {
    async function fetchColors() {
      try {
        const res = await fetch('/api/admin/products/colors', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch colors');
        const data: ExistingColor[] = await res.json();
        setExistingColors(data);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to load colors', e);
        }
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

  // Calculate total upload size for all files
  const totalUploadSize = useMemo(() => {
    let total = 0;
    if (audioFile) total += audioFile.size;
    if (tradingImage) total += tradingImage.size;
    variants.forEach(v => {
      v.variantMedia.forEach(file => {
        total += file.size;
      });
    });
    return total;
  }, [audioFile, tradingImage, variants]);

  const isOverSizeLimit = totalUploadSize > MAX_TOTAL_UPLOAD_BYTES;
  const sizePercentage = Math.min((totalUploadSize / MAX_TOTAL_UPLOAD_BYTES) * 100, 100);
  
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
      variantMedia: [], 
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
  
  const handleMediaChange = useCallback((id: number, files: FileList | null) => {
    debugLog(`🖼️ handleMediaChange called for variant ${id}`, files);
    if (!files) {
      debugLog('❌ No files provided');
      return;
    }
    const newMedia = Array.from(files);
    
    // Check individual file sizes
    const oversizedFile = newMedia.find(file => file.size > MAX_FILE_UPLOAD_BYTES);
    if (oversizedFile) {
      setError(`File "${oversizedFile.name}" is ${formatFileSize(oversizedFile.size)} which exceeds the ${MAX_FILE_UPLOAD_MB}MB limit per file.`);
      setShowErrorModal(true);
      return;
    }
    
    debugLog(`📁 Adding ${newMedia.length} new files:`, newMedia.map(file => file.name));
    setVariants(prev => {
      const updated = prev.map(v => {
        if (v.id === id) {
          const mergedMedia = [...v.variantMedia, ...newMedia];
          const updatedVariant: ProductVariant = {
            ...v,
            variantMedia: mergedMedia,
            thumbnailImageName: v.thumbnailImageName ?? mergedMedia[0]?.name ?? null
          };
          debugLog(`✅ Updated variant ${id} now has ${updatedVariant.variantMedia.length} files`);
          return updatedVariant;
        }
        return v;
      });
      debugLog('📊 Updated variants state:', updated);
      return updated;
    });
  }, []);

  const removeMedia = useCallback((variantId: number, fileToRemove: File) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      const filteredMedia = v.variantMedia.filter(mediaFile => mediaFile !== fileToRemove);
      const updatedThumbnail = v.thumbnailImageName === fileToRemove.name ? (filteredMedia[0]?.name ?? null) : v.thumbnailImageName;
      return { ...v, variantMedia: filteredMedia, thumbnailImageName: updatedThumbnail };
    }));
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
    setSaveProgress(0);
    setSaveMessage('Validating product data...');

    if (duplicateColorNames.size > 0) {
      setError('Duplicate color variants detected. Each variant must have a unique color name.');
      setShowErrorModal(true);
      setIsLoading(false);
      return;
    }

    try {
      setSaveProgress(5);
      let runningBytes = 0;
      const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
      const enforceLimits = (file: File | null, label: string) => {
        if (!file) return false;
        if (file.size > MAX_FILE_UPLOAD_BYTES) {
          setError(`${label} is ${formatMb(file.size)}MB which exceeds the ${MAX_FILE_UPLOAD_MB}MB per-file limit.`);
          setShowErrorModal(true);
          setIsLoading(false);
          return true;
        }
        runningBytes += file.size;
        if (runningBytes > MAX_TOTAL_UPLOAD_BYTES) {
          setError(`Combined upload size is ${formatMb(runningBytes)}MB which exceeds the ${MAX_TOTAL_UPLOAD_MB}MB total limit.`);
          setShowErrorModal(true);
          setIsLoading(false);
          return true;
        }
        return false;
      };

      if (enforceLimits(audioFile, 'Audio file')) return;
      if (enforceLimits(tradingImage, 'Trading card image')) return;
      for (const variant of variants) {
        for (const mediaFile of variant.variantMedia) {
          const label = `${variant.colorName || 'Variant'} media`;
          if (enforceLimits(mediaFile, label)) return;
        }
      }

      setSaveProgress(10);
      setSaveMessage('Preparing files for upload...');

      debugLog('🚀 Starting form submission...');
      debugLog('📊 Current variants state:', variants);
      
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('shippingCost', shippingCost);
      if (audioFile) formData.append('audioFile', audioFile);
      if (tradingImage) formData.append('tradingImage', tradingImage);
      
      setSaveProgress(20);
      setSaveMessage('Processing variant data...');
      
      // Include client-side IDs for media mapping, exclude variantMedia from JSON
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const variantsForApi = variants.map(({ variantMedia, ...rest }) => rest);
      debugLog('🔍 Variants being sent to API:', variantsForApi);
      formData.append('variants', JSON.stringify(variantsForApi));
      
      setSaveProgress(30);
      setSaveMessage('Adding media files...');
      
      // Add variant-specific images only
      variants.forEach(variant => {
        debugLog(`🖼️ Adding media for variant ${variant.id} (${variant.colorName}): ${variant.variantMedia.length} files`);
      // Add variant-specific media
        variant.variantMedia.forEach((file, index) => {
          debugLog(`📎 Adding file ${index + 1}: ${file.name} (${file.size} bytes) as variantMedia_${variant.id}`);
          formData.append(`variantMedia_${variant.id}`, file);
        });
      });

      debugLog('📤 Submitting form data...');
      // Debug: Log all FormData entries
      debugLog('🔍 FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          debugLog(`  ${key}: ${value.name} (${value.size} bytes)`);
        } else {
          debugLog(`  ${key}: ${value}`);
        }
      }
      
      setSaveProgress(40);
      setSaveMessage('Uploading product data...');
      
      // Use XMLHttpRequest for progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const uploadProgress = Math.round((event.loaded / event.total) * 50);
            setSaveProgress(40 + uploadProgress);
            setSaveMessage(`Uploading... ${Math.round((event.loaded / event.total) * 100)}%`);
          }
        });
        
        xhr.addEventListener('load', () => {
          setSaveProgress(95);
          setSaveMessage('Processing server response...');
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers({ 'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json' })
          });
          resolve(response);
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred while uploading'));
        });
        
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out. Please try again.'));
        });
        
        xhr.open('POST', '/api/admin/products');
        xhr.timeout = 300000; // 5 minute timeout
        xhr.send(formData);
      });
      
      debugLog('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => {
          if (response.status === 413) {
            return {
              error: 'UPLOAD_TOO_LARGE',
              message: `Server rejected the upload (HTTP 413). Check VPS reverse proxy limits and retry with files under ${MAX_TOTAL_UPLOAD_MB}MB total.`
            };
          }
          return { error: 'Unknown error' };
        });
        console.error('API Error:', errorData);
        const errorMessage = errorData.message
          || errorData.error
          || (response.status === 413
                ? `Upload too large. Ensure each file is under ${MAX_FILE_UPLOAD_MB}MB and total upload under ${MAX_TOTAL_UPLOAD_MB}MB.`
                : `HTTP ${response.status}: Failed to create product`);
        throw new Error(errorMessage);
      }
      
      setSaveProgress(100);
      setSaveMessage('Product created successfully!');
      
      // Small delay to show 100% before redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // On success, redirect
      router.push('/admin/products?created=true');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
      setSaveProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Saving Overlay */}
      <SavingOverlay isVisible={isLoading} progress={saveProgress} message={saveMessage} />
      
      {/* Error Modal */}
      <ErrorModal 
        isVisible={showErrorModal} 
        title="Error Creating Product" 
        message={error || 'An unexpected error occurred'} 
        onClose={() => setShowErrorModal(false)} 
      />
      
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
                <button type="submit" disabled={isLoading || isOverSizeLimit} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white border border-transparent rounded-lg shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
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
            {/* Upload Size Indicator */}
            {totalUploadSize > 0 && (
              <div className="px-4 py-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">
                    Total Upload Size: {formatFileSize(totalUploadSize)} / {MAX_TOTAL_UPLOAD_MB}MB
                  </span>
                  {isOverSizeLimit && (
                    <span className="text-xs font-semibold text-red-600">
                      ⚠️ Exceeds limit! Remove some files.
                    </span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${isOverSizeLimit ? 'bg-red-500' : sizePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${sizePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="flex flex-col col-span-1 gap-8 lg:col-span-2">
              
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
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Describe your product..."
                    />
                    <p className="mt-2 text-xs text-slate-500">Use the toolbar to add line breaks, bullet points, and bold highlights.</p>
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
                        {tradingCardPreviewUrl && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-green-50">
                            {/* eslint-disable-next-line @next/next/no-img-element -- Use native img for blob URLs */}
                            <img
                              src={tradingCardPreviewUrl}
                              alt="Trading card preview"
                              width={32}
                              height={40}
                              className="object-cover rounded"
                            />
                            <p className="text-sm text-green-700">{tradingImage?.name} selected</p>
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
                              <label className="block mb-2 text-sm font-medium text-slate-700">Variant Media (Color-specific)</label>
                              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                                {activeVariant.variantMedia.map((file, i) => (
                                  <VariantMediaPreview
                                    key={`${activeVariant.id}-${file.name}-${file.lastModified}-${i}`}
                                    variantId={activeVariant.id}
                                    file={file}
                                    isThumbnail={activeVariant.thumbnailImageName === file.name}
                                    onSelectThumbnail={setThumbnail}
                                    onRemove={removeMedia}
                                  />
                                ))}
                                <label htmlFor={`variantImage-upload-${activeVariant.id}`} className="flex flex-col items-center justify-center text-center transition bg-white border-2 border-dashed rounded-lg cursor-pointer aspect-square border-slate-300 hover:border-primary hover:bg-primary/5">
                                  <ImageIcon size={20} className="text-slate-400" />
                                  <span className="mt-1 text-xs text-slate-500">Add</span>
                                  <input id={`variantImage-upload-${activeVariant.id}`} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleMediaChange(activeVariant.id, e.target.files)} />
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