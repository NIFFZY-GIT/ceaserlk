"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Check, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Helper function to detect video URLs
const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v|MOV|MP4)$/i.test(url);

// --- Type Definitions ---
type StockInfo = { id: string; size: string; stock: number };
type ProductVariant = {
  variantId: string;
  price: string;
  compareAtPrice: string | null;
  thumbnailUrl: string;
  colorName: string;
  colorHex: string;
  images: { id: string, url: string }[];
  stock: StockInfo[];
};
type Product = {
  id: string;
  name: string;
  variants: ProductVariant[];
};

const OutOfStockLine = () => (
  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 rotate-[-25deg] transform"></div>
);

// Size sorting utility - orders sizes as XS, S, M, L, XL, XXL
const sizeOrder: Record<string, number> = {
  'XS': 0,
  'S': 1,
  'M': 2,
  'L': 3,
  'XL': 4,
  'XXL': 5,
};

const sortStockItems = (items: StockInfo[]): StockInfo[] => {
  const sorted = [...items].sort((a, b) => {
    const orderA = sizeOrder[a.size.toUpperCase()] ?? 999;
    const orderB = sizeOrder[b.size.toUpperCase()] ?? 999;
    return orderA - orderB;
  });
  return sorted;
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();
  const { user, isGuest } = useAuth();
  const router = useRouter();

  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAdded, setShowAdded] = useState(false);

  const hasValidData = product?.variants?.length > 0;
  const activeVariant = hasValidData ? product.variants[activeVariantIndex] : null;

  useEffect(() => {
    if (activeVariant) {
      const firstAvailableSize = activeVariant.stock.find(s => s.stock > 0)?.size || null;
      setSelectedSize(firstAvailableSize);
    }
  }, [activeVariant]);

  if (!hasValidData || !activeVariant) {
    return null;
  }

  const price = parseFloat(activeVariant.price);
  const compareAtPrice = activeVariant.compareAtPrice ? parseFloat(activeVariant.compareAtPrice) : null;
  const isOnSale = compareAtPrice && compareAtPrice > price;
  // --- Only use first 2 images, no videos ---
  const imagesOnly = Array.isArray(activeVariant.images) && activeVariant.images.length > 0 
    ? activeVariant.images.filter(img => !isVideoUrl(img.url)).slice(0, 2)
    : [];
  // Also check if thumbnail is a video
  const thumbnailIsImage = activeVariant.thumbnailUrl && !isVideoUrl(activeVariant.thumbnailUrl);
  const mainImage = imagesOnly[0]?.url || (thumbnailIsImage ? activeVariant.thumbnailUrl : null) || '/images/image.jpg';
  const hoverImage = imagesOnly[1]?.url || mainImage;
  const currentImageUrl = isHovered ? hoverImage : mainImage;
  const totalStock = activeVariant.stock.reduce((sum, s) => sum + s.stock, 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user && !isGuest) {
      router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    if (!selectedSize) { alert("Please select a size."); return; }
    const selectedSku = activeVariant.stock.find(s => s.size === selectedSize);
    if (!selectedSku || selectedSku.stock <= 0) { alert("This size is out of stock."); return; }
    setIsAdding(true);
    try {
      await addToCart(selectedSku.id, 1);
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 2000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Could not add item to cart.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex flex-col h-full p-4 transition-all duration-300 bg-white border border-gray-100 rounded-xl hover:shadow-xl hover:-translate-y-1">
        <Link 
          href={`/product/${product.id}?variant=${activeVariant.variantId}`} 
          className="relative block w-full overflow-hidden rounded-md aspect-[3/4]"
        >
          <Image key={currentImageUrl} src={currentImageUrl} alt={`${product.name} - ${activeVariant.colorName}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" style={{ objectFit: 'cover' }} className="transition-all duration-500 group-hover:scale-105" />
          {isOnSale && (<div className="absolute top-0 left-0"><div className="absolute px-12 py-1.5 text-sm font-bold text-white uppercase transform -rotate-45 bg-black top-2 -left-10">SALE</div></div>)}
        </Link>
        <div className="flex flex-col flex-grow mt-4">
          <h3 className="text-lg font-semibold text-black capitalize">{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {isOnSale ? (<><span className="text-xl font-bold text-black">LKR {price.toFixed(2)}</span><span className="font-medium text-gray-500 line-through text-md">LKR {compareAtPrice!.toFixed(2)}</span></>) : (<span className="text-xl font-bold text-black">LKR {price.toFixed(2)}</span>)}
          </div>
          {product.variants.length > 1 && (
            <div className="flex items-center gap-2 mt-3">
              {product.variants.map((variant, index) => (
                <button 
                  key={variant.variantId} 
                  onMouseEnter={() => setActiveVariantIndex(index)}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveVariantIndex(index); }}
                  aria-label={`Select color ${variant.colorName}`}
                  // --- THIS IS THE FIX ---
                  className={`w-5 h-5 rounded-full border border-gray-300 ring-2 ring-offset-1 transition-all ${
                    activeVariantIndex === index ? 'ring-primary' : 'ring-transparent'
                  }`}
                  // --- END OF FIX ---
                  style={{ backgroundColor: variant.colorHex }}
                />
              ))}
            </div>
          )}
          {activeVariant.stock.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-3">
              {sortStockItems(activeVariant.stock).map(stockItem => (
                <button 
                  key={stockItem.id} 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (stockItem.stock > 0) setSelectedSize(stockItem.size); }} 
                  disabled={stockItem.stock <= 0}
                  className={`relative min-w-8 h-8 px-2 border rounded-md font-semibold text-xs flex items-center justify-center transition-colors ${stockItem.stock > 0 ? (selectedSize === stockItem.size ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100') : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                >
                  {stockItem.size}
                  {stockItem.stock <= 0 && <OutOfStockLine />}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between flex-grow pt-4 mt-auto">
            <div className="h-5">
              {totalStock > 0 ? (<p className="text-sm text-gray-600">{selectedSize ? (<><span className="font-semibold text-black">{activeVariant.stock.find(s => s.size === selectedSize)?.stock}</span> in stock</>) : ('Select a size')}</p>) : (<p className="text-sm font-semibold text-red-500">Out of Stock</p>)}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || totalStock === 0 || isAdding || showAdded}
              className={`px-8 py-3 text-sm font-semibold text-white transition-all duration-300 rounded-full disabled:cursor-not-allowed ${
                showAdded 
                  ? 'bg-green-500 scale-105' 
                  : 'bg-black hover:bg-gray-800 disabled:bg-gray-400'
              }`}
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : showAdded ? (
                <span className="flex items-center gap-1.5 animate-pulse">
                  <Check className="w-4 h-4" />
                  Added!
                </span>
              ) : (
                'Add to Cart'
              )}
            </button>
          </div>
          
          {/* Success Animation Overlay */}
          {showAdded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2 p-4 bg-white/95 rounded-xl shadow-lg animate-bounce-in">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">Added to Cart!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};