// src/app/components/ProductCard.tsx

"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext'; // Assuming you have this for cart functionality

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
  const { addToCart } = useCart(); // Get cart function
  const [currentImage, setCurrentImage] = useState(product.images[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.availableSizes[0] || null);
  const [isLiked, setIsLiked] = useState(false);
  
  const isSizeAvailable = (size: string) => product.availableSizes.includes(size);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!selectedSize) {
      alert("Please select a size.");
      return;
    }
    addToCart({
      id: product.id + product.colors.indexOf(selectedColor) + product.sizes.indexOf(selectedSize),
      productId: product.id,
      name: product.name,
      price: product.salePrice ?? product.price,
      quantity: 1,
      imageUrl: product.images[0].url,
    });
  };

  return (
    <div 
      className="flex flex-col h-full group" // Added h-full to ensure consistent height in grids
      onMouseEnter={() => product.images[1] && setCurrentImage(product.images[1])}
      onMouseLeave={() => setCurrentImage(product.images[0])}
    >
      {/* 
        ====================================================================
          CHANGE 1: The entire card content is wrapped in a new div.
          This div provides the slightly dark background, padding, and hover effect.
        ====================================================================
      */}
      <div className="flex flex-col h-full p-4 transition-all duration-300 border border-gray-100 bg-gray-50 rounded-xl hover:shadow-xl hover:-translate-y-1">
        <Link 
          href={`/product/${product.id}`} 
          // CHANGE 2: Removed bg-gray-100 as the parent now has the background.
          className="relative block w-full overflow-hidden rounded-md aspect-square"
        >
          {/* --- IMAGE & OVERLAYS --- */}
          <Image
            key={currentImage.id}
            src={currentImage.url}
            alt={product.name}
            fill
            style={{ objectFit: 'cover' }}
            className="transition-all duration-500 group-hover:scale-105"
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
              e.preventDefault();
              setIsLiked(!isLiked);
            }}
            className="absolute p-2 transition rounded-full top-3 right-3 bg-white/70 backdrop-blur-sm hover:bg-white"
          >
            <Heart size={20} className={`transition-all ${isLiked ? 'fill-accent text-accent' : 'text-gray-600'}`} />
          </button>
        </Link>
        
        {/* --- PRODUCT INFO --- */}
        <div className="flex flex-col flex-grow mt-4">
          <h3 className="text-lg font-semibold text-black uppercase">{product.name}</h3>
          
          {/* Price */}
          <div className="flex items-center gap-2 mt-1">
            {product.salePrice ? (
              <>
                <p className="text-lg font-bold text-accent">${product.salePrice.toFixed(2)}</p>
                <p className="text-gray-500 line-through text-md">${product.price.toFixed(2)}</p>
              </>
            ) : (
              <p className="text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
            )}
          </div>
          
          {/* Color Swatches */}
          <div className="flex items-center gap-2 mt-3">
            {product.colors.map(color => (
              <button
                key={color.name}
                onClick={(e) => { e.preventDefault(); setSelectedColor(color); }}
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
                onClick={(e) => { e.preventDefault(); if (isSizeAvailable(size)) setSelectedSize(size); }}
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
          <div className="flex items-end flex-grow mt-4">
            <button
              onClick={handleAddToCart}
              className="w-full py-3 font-bold tracking-wider text-white uppercase transition-colors bg-black rounded-full hover:bg-gray-800"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};