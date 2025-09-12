"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext'; // Assuming you have a CartContext

// --- TYPE DEFINITIONS (Matching your API response) ---
type ProductColor = {
  color_id: number;
  name: string;
  hex_code: string;
};
type ProductImage = {
  image_id: number;
  url: string;
  color_id: number | null;
};
type Product = {
  id: number;
  name: string;
  price: number;
  salePrice?: number | null;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: string[];
  stock: { [size: string]: number }; 
};

// Helper component for out-of-stock sizes
const OutOfStockLine = () => (
  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 rotate-[-25deg] transform"></div>
);

export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();

  // --- STATE MANAGEMENT ---
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>(product.colors[0]);
  const [currentImage, setCurrentImage] = useState<ProductImage | null>(product.images[0] || null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Map sizes to objects with id and name (assuming backend returns sizes as array of objects)
  const availableSizes = product.sizes.filter(size => (product.stock?.[size] || 0) > 0);
  const [selectedSize, setSelectedSize] = useState<string | null>(availableSizes[0] || null);

  // --- DERIVED VALUES ---
  const totalStock = Object.values(product.stock || {}).reduce((sum, count) => sum + count, 0);
  const isSizeAvailable = (size: string) => (product.stock?.[size] || 0) > 0;

  // ====================================================================
  //  CORE LOGIC FOR IMAGE SWITCHING ON HOVER AND COLOR SELECTION
  // ====================================================================
  useEffect(() => {
    // Safety checks for products with missing data
    if (!product.images || product.images.length === 0 || !selectedColor) {
      setCurrentImage(product.images?.[0] || null);
      return;
    }

    // STEP 1: Determine the main image to display based on the selected color.
    // Priority 1: Find the image specifically linked to the selected color.
    const colorSpecificImage = product.images.find(img => img.color_id === selectedColor.color_id);
    // Priority 2 (Fallback): Find the first "general" image (not linked to any color).
    const firstGeneralImage = product.images.find(img => img.color_id === null);
    // Final Decision for Main Image: Use the color-specific one if it exists, otherwise the general one, or finally, the very first image.
    const mainImage = colorSpecificImage || firstGeneralImage || product.images[0];

    // STEP 2: Determine the image to show on hover (it must be different from the main image).
    let hoverImage: ProductImage | null = null;
    if (product.images.length > 1) {
      hoverImage =
        // Priority 1: Find another image of the SAME color.
        product.images.find(img => img.color_id === selectedColor.color_id && img.image_id !== mainImage.image_id) ||
        // Priority 2: Find a "general" image that isn't the main one.
        product.images.find(img => img.color_id === null && img.image_id !== mainImage.image_id) ||
        // Priority 3 (Last Resort): Find ANY other image that isn't the main one.
        product.images.find(img => img.image_id !== mainImage.image_id) ||
        null;
    }

    // STEP 3: Set the current image based on whether the card is being hovered.
    if (isHovered && hoverImage) {
      // If hovering and a valid hover image was found, show it.
      setCurrentImage(hoverImage);
    } else {
      // Otherwise (not hovering or no hover image available), show the main image for the selected color.
      setCurrentImage(mainImage);
    }
  }, [selectedColor, isHovered, product.images]); // This logic re-runs whenever the color changes or the hover state changes.

  // --- EVENT HANDLERS ---
  const handleColorSelect = (e: React.MouseEvent, color: ProductColor) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColor(color); // This state change will trigger the useEffect hook to run again.
  };

const handleAddToCart = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!selectedSize) { alert("Please select a size."); return; }
  if (!selectedColor) { alert("Please select a color."); return; }
  if (!currentImage) { alert("Image not available."); return; }

  // Validate that the selected size exists in the product's sizes array
  if (!product.sizes.includes(selectedSize)) {
    alert("Selected size is not valid for this product.");
    return;
  }

  // Check if we have stock for this size
  const sizeStock = product.stock[selectedSize];
  if (!sizeStock || sizeStock <= 0) {
    alert("This size is out of stock.");
    return;
  }

  // Find colorId and sizeId (assuming color_id and size_id are available)
  const colorId = selectedColor?.color_id;
  // For now, pass sizeName as productSizeId (fix backend later)
  const productSizeId = Number(selectedSize);

  const productDetails = {
    productId: product.id,
    productSizeId,
    name: product.name,
    price: product.salePrice || product.price,
    imageUrl: currentImage.url,
    colorName: selectedColor.name,
    sizeName: selectedSize,
    colorId,
  };

  await addToCart(productDetails, 1);
};

  return (
    <div 
      className="flex flex-col h-full group"
      // These handlers set the `isHovered` state, triggering the useEffect hook.
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full p-4 transition-all duration-300 bg-white border border-gray-100 rounded-xl hover:shadow-xl hover:-translate-y-1">
        <Link href={`/product/${product.id}`} className="relative block w-full overflow-hidden rounded-md aspect-square">
          {currentImage ? (
            <Image
              key={currentImage.image_id} // Key is important for re-rendering animations
              src={currentImage.url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              className="transition-all duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-200">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          
          {product.salePrice && (
            <div className="absolute top-0 left-0">
              <div className="absolute top-2 -left-10 bg-black text-white text-sm font-bold uppercase px-12 py-1.5 transform -rotate-45">SALE</div>
            </div>
          )}
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsLiked(!isLiked); }} className="absolute p-2 transition rounded-full top-3 right-3 bg-white/70 backdrop-blur-sm hover:bg-white">
            <Heart size={20} className={`transition-all ${isLiked ? 'fill-accent text-accent' : 'text-gray-600'}`} />
          </button>
        </Link>
        
        <div className="flex flex-col flex-grow mt-4">
          <h3 className="text-lg font-semibold text-black uppercase">{product.name}</h3>
          
          <div className="flex items-center gap-2 mt-1">
            {product.salePrice ? (
              <>
                <span className="text-xl font-bold text-black">LKR {product.salePrice.toFixed(2)}</span>
                <span className="font-medium text-gray-500 line-through text-md">LKR {product.price.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-xl font-bold text-black">LKR {product.price.toFixed(2)}</span>
            )}
          </div>

          {product.colors.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {product.colors.map(color => (
                <button 
                  key={color.color_id} 
                  // THIS IS THE TRIGGER FOR COLOR-BASED IMAGE SWITCHING
                  onClick={(e) => handleColorSelect(e, color)} 
                  aria-label={`Select color ${color.name}`}
                  className={`w-5 h-5 rounded-full ring-2 ring-offset-1 transition-all ${selectedColor?.color_id === color.color_id ? 'ring-primary' : 'ring-transparent'}`}
                  style={{ backgroundColor: color.hex_code }}
                />
              ))}
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {product.sizes.map(size => (
                <button key={size} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isSizeAvailable(size)) setSelectedSize(size); }} disabled={!isSizeAvailable(size)}
                  className={`relative w-9 h-9 border rounded-md font-semibold text-sm flex items-center justify-center transition-colors ${ isSizeAvailable(size) ? (selectedSize === size ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100') : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>
                  {size}
                  {!isSizeAvailable(size) && <OutOfStockLine />}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between flex-grow pt-4 mt-auto">
            <div className="h-5">
              {totalStock > 0 ? (
                <p className="text-sm text-gray-600">
                  {selectedSize ? <><span className="font-semibold text-black">{product.stock[selectedSize]}</span> in stock</> : 'Select a size'}
                </p>
              ) : (
                <p className="text-sm font-semibold text-red-500">Out of Stock</p>
              )}
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || totalStock === 0}
              className="px-8 py-3 text-sm font-semibold text-white transition-colors bg-black rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};