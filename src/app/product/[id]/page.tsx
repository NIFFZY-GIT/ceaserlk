// src/app/product/[id]/page.tsx
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext'; // We'll need this for the "Add to Cart" button
import { Check, ShieldCheck, Minus, Plus } from 'lucide-react';

// MOCK DATA: In a real application, you would fetch this product data 
// from your PostgreSQL database based on the `params.id`.
const productData = {
  id: 1,
  name: 'Conquer Tee',
  price: 29.99,
  description: "The Conquer Tee isn't just a piece of clothing; it's a mindset. Made from a premium tri-blend fabric, it offers unmatched comfort and durability, whether you're in the gym or mapping out your next big move. Wear it as a reminder: every challenge is an opportunity to conquer.",
  images: [
    { id: 1, url: '/shirt-1-front.png' },
    { id: 2, url: '/shirt-1-back.png' },
    { id: 3, url: '/shirt-1-detail.png' },
  ],
  colors: [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF', ringColor: 'ring-gray-400' },
    { name: 'Forest Green', hex: '#107D3F' },
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
};

const ProductPage = ({ params }: { params: { id: string } }) => {
  // We'll add the real addToCart function later
  // const { addToCart } = useCart(); 

  const [selectedImage, setSelectedImage] = useState(productData.images[0]);
  const [selectedColor, setSelectedColor] = useState(productData.colors[0]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    console.log('Adding to cart:', {
      id: productData.id,
      name: productData.name,
      price: productData.price,
      quantity: quantity,
      size: selectedSize,
      color: selectedColor.name,
      imageUrl: selectedImage.url
    });
    // In the future, you'll call a function from your useCart hook here:
    // addToCart({ ...product details... });
    // openCart(); // Optionally open the cart drawer after adding
  };

  return (
    <div className="bg-brand-white py-12 md:py-20">
      <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
        
        {/* --- IMAGE GALLERY --- */}
        <div className="flex flex-col gap-4 sticky top-28">
          <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={selectedImage.url}
              alt={`${productData.name} - ${selectedColor.name}`}
              fill
              style={{objectFit: 'cover'}}
              className="transition-opacity duration-300"
              key={selectedImage.id} // Re-renders image on change for transition
            />
          </div>
          <div className="grid grid-cols-5 gap-4">
            {productData.images.map(image => (
              <button 
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className={`relative aspect-square w-full bg-gray-100 rounded-md overflow-hidden ring-2 transition ${selectedImage.id === image.id ? 'ring-primary' : 'ring-transparent hover:ring-gray-300'}`}
              >
                <Image
                  src={image.url}
                  alt={`Thumbnail ${image.id}`}
                  fill
                  style={{objectFit: 'cover'}}
                />
              </button>
            ))}
          </div>
        </div>

        {/* --- PRODUCT DETAILS --- */}
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-black">{productData.name}</h1>
          <p className="text-3xl font-bold text-primary my-4">${productData.price.toFixed(2)}</p>
          <p className="text-gray-700 leading-relaxed">{productData.description}</p>
          
          {/* COLOR SELECTOR */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-black">Color: <span className="font-semibold">{selectedColor.name}</span></h3>
            <div className="flex flex-wrap gap-3 mt-2">
              {productData.colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select color ${color.name}`}
                  className={`w-8 h-8 rounded-full transition-transform duration-200 transform hover:scale-110 ring-2 ring-offset-2 ${selectedColor.name === color.name ? color.ringColor || 'ring-primary' : 'ring-transparent'}`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>

          {/* SIZE SELECTOR */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-black">Size</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {productData.sizes.map(size => (
                <button 
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-5 py-2 border rounded-md font-semibold transition-colors text-sm ${selectedSize === size ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* QUANTITY & ADD TO CART */}
          <div className="mt-8 flex items-center gap-4">
            {/* Quantity */}
            <div className="flex items-center border border-gray-300 rounded-md">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 text-gray-600 hover:bg-gray-100"><Minus size={16} /></button>
              <span className="px-5 font-semibold text-black">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="p-3 text-gray-600 hover:bg-gray-100"><Plus size={16} /></button>
            </div>
            {/* Add to Cart Button */}
            <button 
              onClick={handleAddToCart}
              className="flex-grow bg-accent text-white py-4 rounded-md font-bold text-base uppercase tracking-wider hover:bg-red-500 transition-colors duration-300"
            >
              Add to Cart
            </button>
          </div>

          {/* Features / Guarantees */}
          <div className="mt-8 space-y-3 text-gray-600 border-t pt-6">
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