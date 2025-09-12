"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// --- NEW TYPE DEFINITIONS that match your new API response ---
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
  id: string; // The base product ID
  name: string;
  variants: ProductVariant[];
};

// Helper component for out-of-stock sizes
const OutOfStockLine = () => (
  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 rotate-[-25deg] transform"></div>
);

export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();

  // --- ROBUSTNESS CHECK ---
  if (!product?.variants?.length) {
    return null; // Don't render a card if there's no data
  }

  // --- REFACTORED STATE MANAGEMENT ---
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // --- DERIVED VALUES from the active variant ---
  const activeVariant = product.variants[activeVariantIndex];
  const price = parseFloat(activeVariant.price);
  const compareAtPrice = activeVariant.compareAtPrice ? parseFloat(activeVariant.compareAtPrice) : null;
  const isOnSale = compareAtPrice && compareAtPrice > price;
  
  // Dynamic image logic: show a different image on hover if available
  const mainImage = activeVariant.thumbnailUrl || '/images/image.jpg';
  const hoverImage = activeVariant.images?.find(img => img.url !== mainImage)?.url || mainImage;
  const currentImageUrl = isHovered ? hoverImage : mainImage;

  const totalStock = activeVariant.stock.reduce((sum, s) => sum + s.stock, 0);
  const isSizeAvailable = (size: string) => activeVariant.stock.find(s => s.size === size)?.stock ?? 0 > 0;
  
  // Effect to auto-select the first available size when the variant changes
  useEffect(() => {
    const firstAvailableSize = activeVariant.stock.find(s => s.stock > 0)?.size || null;
    setSelectedSize(firstAvailableSize);
  }, [activeVariant]);

  // --- EVENT HANDLERS ---
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSize) { 
      alert("Please select a size."); 
      return; 
    }
    
    const selectedSku = activeVariant.stock.find(s => s.size === selectedSize);
    if (!selectedSku || selectedSku.stock <= 0) {
      alert("This size is out of stock.");
      return;
    }

    setIsAdding(true);
    try {
      // Now we have the correct SKU ID!
      await addToCart(selectedSku.id, 1);
      console.log("Added to cart successfully:", {
        skuId: selectedSku.id,
        productName: product.name,
        variant: activeVariant.colorName,
        size: selectedSku.size,
        quantity: 1
      });
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Could not add item to cart. Please try again.");
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
      <div className="flex flex-col h-full p-4 transition-all duration-300 bg-white border border-gray-100 rounded-xl hover:shadow-xl hover:-translate-y-1">
        <Link 
          href={`/product/${product.id}?variant=${activeVariant.variantId}`} 
          className="relative block w-full overflow-hidden rounded-md aspect-square"
        >
          <Image
            key={currentImageUrl} // Key change triggers transition
            src={currentImageUrl}
            alt={`${product.name} - ${activeVariant.colorName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            className="transition-all duration-500 group-hover:scale-105"
          />
          
          {/* Sale badge */}
          {isOnSale && (
            <div className="absolute top-0 left-0">
              <div className="absolute top-2 -left-10 bg-black text-white text-sm font-bold uppercase px-12 py-1.5 transform -rotate-45">
                SALE
              </div>
            </div>
          )}
          
          {/* Wishlist button */}
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              setIsLiked(!isLiked); 
            }} 
            className="absolute p-2 transition rounded-full top-3 right-3 bg-white/70 backdrop-blur-sm hover:bg-white"
          >
            <Heart 
              size={20} 
              className={`transition-all ${isLiked ? 'fill-accent text-accent' : 'text-gray-600'}`} 
            />
          </button>
        </Link>
        
        <div className="flex flex-col flex-grow mt-4">
          <h3 className="text-lg font-semibold text-black uppercase">{product.name}</h3>
          
          {/* Price display */}
          <div className="flex items-center gap-2 mt-1">
            {isOnSale ? (
              <>
                <span className="text-xl font-bold text-black">LKR {price.toFixed(2)}</span>
                <span className="font-medium text-gray-500 line-through text-md">
                  LKR {compareAtPrice!.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-black">LKR {price.toFixed(2)}</span>
            )}
          </div>

          {/* Color variants */}
          {product.variants.length > 1 && (
            <div className="flex items-center gap-2 mt-3">
              {product.variants.map((variant, index) => (
                <button 
                  key={variant.variantId} 
                  onMouseEnter={() => setActiveVariantIndex(index)} // Hover to preview
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    setActiveVariantIndex(index); 
                  }} // Click to select
                  aria-label={`Select color ${variant.colorName}`}
                  className={`w-5 h-5 rounded-full ring-2 ring-offset-1 transition-all ${
                    activeVariantIndex === index ? 'ring-primary' : 'ring-transparent'
                  }`}
                  style={{ backgroundColor: variant.colorHex }}
                />
              ))}
            </div>
          )}

          {/* Size selection */}
          {activeVariant.stock.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {activeVariant.stock.map(stockItem => (
                <button 
                  key={stockItem.id} 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (stockItem.stock > 0) setSelectedSize(stockItem.size); 
                  }} 
                  disabled={stockItem.stock <= 0}
                  className={`relative w-9 h-9 border rounded-md font-semibold text-sm flex items-center justify-center transition-colors ${
                    stockItem.stock > 0 
                      ? (selectedSize === stockItem.size 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-black border-gray-300 hover:bg-gray-100'
                        )
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  {stockItem.size}
                  {stockItem.stock <= 0 && <OutOfStockLine />}
                </button>
              ))}
            </div>
          )}

          {/* Stock info and Add to Cart */}
          <div className="flex items-center justify-between flex-grow pt-4 mt-auto">
            <div className="h-5">
              {totalStock > 0 ? (
                <p className="text-sm text-gray-600">
                  {selectedSize ? (
                    <>
                      <span className="font-semibold text-black">
                        {activeVariant.stock.find(s => s.size === selectedSize)?.stock}
                      </span> in stock
                    </>
                  ) : (
                    'Select a size'
                  )}
                </p>
              ) : (
                <p className="text-sm font-semibold text-red-500">Out of Stock</p>
              )}
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || totalStock === 0 || isAdding}
              className="px-8 py-3 text-sm font-semibold text-white transition-colors bg-black rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800"
            >
              {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};