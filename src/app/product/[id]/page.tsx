"use client";

import { useState, useEffect, useRef, use } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { Check, ShieldCheck, Minus, Plus, Loader2, Volume2, VolumeX } from 'lucide-react';

// --- Type Definitions (matching our current API response) ---
type ProductColor = { id: number; name: string; hex_code: string; };
type ProductImage = { id: number; url: string; colorId: number | null; };
type ProductSize = { id: number; name: string; stock: number; };
type ProductDetail = {
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  audioUrl?: string | null;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: ProductSize[];
};

const ProductPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const { addToCart, loading: isCartLoading } = useCart();
  
  // State for fetched data and UI
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for user selections
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // NEW: Refs and state for audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  

  
  // Fetch product data on mount
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${resolvedParams.id}`);
        if (!res.ok) throw new Error("Product not found");
        const data: ProductDetail = await res.json();
        setProduct(data);
        // Set initial selections
        setSelectedImage(data.images[0] || null);
        setSelectedColor(data.colors[0] || null);
        // Find the first available size to select by default
        const firstAvailableSize = data.sizes.find(s => s.stock > 0);
        setSelectedSize(firstAvailableSize || null);
        // Initialize edited colors (removed)
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [resolvedParams.id]);
  
  // Effect to change the main image when a new color is selected
  useEffect(() => {
    if (product && selectedColor) {
      const colorSpecificImage = product.images.find(img => img.colorId === selectedColor.id);
      const firstGeneralImage = product.images.find(img => img.colorId === null);
      setSelectedImage(colorSpecificImage || firstGeneralImage || product.images[0] || null);
    }
  }, [selectedColor, product]);
  
  // NEW: Effect to play audio when available
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && product?.audioUrl) {
      audio.play().catch(() => console.log("Audio autoplay was prevented by the browser."));
    }
    return () => {
      audio?.pause();
    };
  }, [product?.audioUrl]);
  
  const handleAddToCart = async () => {
    if (!product || !selectedSize || !selectedColor || !selectedImage) {
      alert("Please select a color and size.");
      return;
    }
    const productDetails = {
      productId: product.id,
      productSizeId: selectedSize.id,
      name: product.name,
      price: product.salePrice || product.price,
      imageUrl: selectedImage.url,
      colorName: selectedColor.name,
      sizeName: selectedSize.name,
    };
    await addToCart(productDetails, quantity);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin" /></div>;
  }
  
  if (!product) {
    return <div className="py-20 text-center">Product not found.</div>;
  }

  return (
    <div className="py-12 bg-white md:py-20">
      {/* NEW: Hidden audio element */}
      {product.audioUrl && (
        <audio ref={audioRef} src={product.audioUrl} loop muted={isMuted} />
      )}

      <div className="container grid items-start gap-8 px-6 mx-auto md:grid-cols-2 md:gap-16">
        {/* --- Image Gallery --- */}
        <div className="flex flex-col gap-4 md:sticky md:top-28">
          <div className="relative w-full overflow-hidden bg-gray-100 rounded-lg aspect-square">
            {selectedImage && (
              <Image src={selectedImage.url} alt={product.name} fill style={{objectFit: 'cover'}} className="transition-opacity duration-300" key={selectedImage.id} />
            )}
            {/* NEW: Mute/Unmute button */}
            {product.audioUrl && (
              <button onClick={() => setIsMuted(!isMuted)} className="absolute p-3 text-white transition-colors rounded-full bottom-4 right-4 bg-black/40 backdrop-blur-sm hover:bg-black/60">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-4">
            {product.images.map(image => (
              <button key={image.id} onClick={() => setSelectedImage(image)} className={`relative aspect-square w-full bg-gray-100 rounded-md overflow-hidden ring-2 transition ${selectedImage?.id === image.id ? 'ring-primary' : 'ring-transparent hover:ring-gray-300'}`}>
                <Image src={image.url} alt={`Thumbnail`} fill style={{objectFit: 'cover'}} />
              </button>
            ))}
          </div>
        </div>

        {/* --- Product Details --- */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-black md:text-5xl">{product.name}</h1>
          <p className="my-4 text-3xl font-bold text-primary">${(product.salePrice || product.price).toFixed(2)}</p>
          <p className="leading-relaxed text-gray-700">{product.description}</p>
          
          <div className="mt-8">
            <h3 className="text-sm font-medium text-black">
              Color: <span className="font-semibold">{selectedColor?.name}</span>
            </h3>
            <div className="flex flex-wrap gap-3 mt-2">
              {product.colors.map(color => (
                <button 
                  key={color.id} 
                  onClick={() => setSelectedColor(color)} 
                  aria-label={`Select ${color.name}`} 
                  className={`w-8 h-8 rounded-full transition-transform duration-200 transform hover:scale-110 ring-2 ring-offset-2 ${selectedColor?.id === color.id ? 'ring-primary' : 'ring-transparent'}`} 
                  style={{ backgroundColor: color.hex_code }} 
                />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-medium text-black">Size</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {product.sizes.map(size => (
                <button key={size.id} onClick={() => setSelectedSize(size)} disabled={size.stock === 0} className={`px-5 py-2 border rounded-md font-semibold transition-colors text-sm ${size.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : selectedSize?.id === size.id ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}>
                  <div className="flex flex-col items-center">
                    <span>{size.name}</span>
                    <span className={`text-xs ${size.stock === 0 ? 'text-gray-400' : selectedSize?.id === size.id ? 'text-gray-300' : 'text-gray-500'}`}>
                      {size.stock === 0 ? 'Out of Stock' : `${size.stock} in stock`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 mt-8 sm:flex-row">
            <div className="flex items-center w-full border border-gray-300 rounded-md sm:w-auto">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 text-gray-600 hover:bg-gray-100"><Minus size={16} /></button>
              <span className="w-full px-5 font-semibold text-center text-black">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="p-3 text-gray-600 hover:bg-gray-100"><Plus size={16} /></button>
            </div>
            <button onClick={handleAddToCart} disabled={!selectedSize || selectedSize.stock === 0 || isCartLoading} className="flex items-center justify-center w-full min-w-[200px] gap-2 py-4 text-base font-bold tracking-wider text-white uppercase transition-colors duration-300 rounded-md sm:flex-grow bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isCartLoading ? <Loader2 className="animate-spin" /> : 'Add to Cart'}
            </button>
          </div>

          <div className="pt-6 mt-8 space-y-3 text-gray-600 border-t">
            <div className="flex items-center gap-2"><Check className="text-primary" size={20} /> Premium tri-blend fabric</div>
            <div className="flex items-center gap-2"><Check className="text-primary" size={20} /> Athletic fit & feel</div>
            <div className="flex items-center gap-2"><ShieldCheck className="text-primary" size={20} /> 30-Day Money Back Guarantee</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;