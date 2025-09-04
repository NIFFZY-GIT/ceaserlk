// src/app/components/ProductCard.tsx
"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';

// Types remain the same
type ProductColor = { name: string; hex: string; ringColor?: string };
type ProductImage = { id: number; url: string };
type Product = {
  id: number;
  name: string;
  price: number;
  salePrice?: number | null;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: string[];
  availableSizes: string[];
};

const OutOfStockLine = () => (
  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 rotate-[-25deg] transform"></div>
);

export const ProductCard = ({ product }: { product: Product }) => {
  const [currentImage, setCurrentImage] = useState(product.images[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.availableSizes[0] || null);
  const [isLiked, setIsLiked] = useState(false);
  
  const isSizeAvailable = (size: string) => product.availableSizes.includes(size);

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
  };

  return (
    // THE CHANGE IS HERE: The hover events are now on the main div
    <div 
      className="group flex flex-col"
      onMouseEnter={() => product.images[1] && setCurrentImage(product.images[1])}
      onMouseLeave={() => setCurrentImage(product.images[0])}
    >
      <Link 
        href={`/product/${product.id}`} 
        className="block relative aspect-square w-full bg-gray-100 rounded-md overflow-hidden"
        // The hover events have been REMOVED from this Link component
      >
        {/* --- IMAGE & OVERLAYS --- */}
        <Image
          key={currentImage.id}
          src={currentImage.url}
          alt={product.name}
          fill
          style={{ objectFit: 'cover' }}
          className="group-hover:scale-105 transition-all duration-500"
        />
        
        {/* Sale Badge */}
        {product.salePrice && (
          <div className="absolute top-0 left-0">
            <div className="absolute top-2 -left-10 bg-black text-white text-sm font-bold uppercase px-12 py-1.5 transform -rotate-45">
              SALE
            </div>
          </div>
        )}
        
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            handleActionClick(e);
            setIsLiked(!isLiked);
          }}
          className="absolute top-3 right-3 p-2 bg-white/70 rounded-full backdrop-blur-sm hover:bg-white transition"
        >
          <Heart size={20} className={`transition-all ${isLiked ? 'fill-accent text-accent' : 'text-gray-600'}`} />
        </button>
      </Link>
      
      {/* --- PRODUCT INFO --- */}
      <div className="mt-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-black uppercase">{product.name}</h3>
        
        {/* Price */}
        <div className="flex items-center gap-2 mt-1">
          {product.salePrice ? (
            <>
              <p className="text-lg text-accent font-bold">${product.salePrice.toFixed(2)}</p>
              <p className="text-md text-gray-500 line-through">${product.price.toFixed(2)}</p>
            </>
          ) : (
            <p className="text-lg text-primary font-bold">${product.price.toFixed(2)}</p>
          )}
        </div>
        
        {/* Color Swatches */}
        <div className="flex items-center gap-2 mt-3">
          {product.colors.map(color => (
            <button
              key={color.name}
              onClick={(e) => { handleActionClick(e); setSelectedColor(color); }}
              aria-label={`Select color ${color.name}`}
              className={`w-5 h-5 rounded-full ring-2 ring-offset-1 ${selectedColor.name === color.name ? color.ringColor || 'ring-primary' : 'ring-transparent'}`}
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>

        {/* Size Selector */}
        <div className="flex items-center gap-2 mt-3">
          {product.sizes.map(size => (
            <button
              key={size}
              onClick={(e) => { handleActionClick(e); if (isSizeAvailable(size)) setSelectedSize(size); }}
              disabled={!isSizeAvailable(size)}
              className={`relative w-9 h-9 border rounded-md font-semibold text-sm flex items-center justify-center transition-colors
                ${isSizeAvailable(size) ? 
                  (selectedSize === size ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100') :
                  'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
            >
              {size}
              {!isSizeAvailable(size) && <OutOfStockLine />}
            </button>
          ))}
        </div>

        {/* Add to Cart Button */}
        <div className="mt-4 flex-grow flex items-end">
          <button
            onClick={handleActionClick}
            className="w-full bg-black text-white py-3 rounded-full font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};