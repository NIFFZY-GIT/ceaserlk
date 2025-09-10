// src/app/product/[id]/page.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { Check, ShieldCheck, Minus, Plus, Volume2, VolumeX } from 'lucide-react';

// MOCK DATA (remains the same)
const productData = {
  id: 1,
  name: 'Conquer Tee',
  price: 29.99,
  description: "The Conquer Tee isn't just a piece of clothing; it's a mindset. Made from a premium tri-blend fabric, it offers unmatched comfort and durability, whether you're in the gym or mapping out your next big move. Wear it as a reminder: every challenge is an opportunity to conquer.",
  images: [
    { id: 1, url: '/images/image.jpg' },
    { id: 2, url: '/images/image1.jpg' },
    { id: 3, url: '/images/image.jpg' },
    
  ],
  colors: [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF', ringColor: 'ring-gray-400' },
    { name: 'Forest Green', hex: '#107D3F' },
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
};

const ProductPage = ({ params }: { params: { id: string } }) => {
  const [selectedImage, setSelectedImage] = useState(productData.images[0]);
  const [selectedColor, setSelectedColor] = useState(productData.colors[0]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // --- Audio useEffect (no changes needed here) ---
  useEffect(() => {
    const audio = audioRef.current;
    const playAudio = async () => {
      if (audio) {
        try {
          await audio.play();
        } catch (error: unknown) {
          if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError') {
            console.log('Audio play() aborted by React Strict Mode, this is normal in development.');
          } else {
            console.error("Audio autoplay was prevented by the browser:", error);
          }
        }
      }
    };
    playAudio();
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  const handleAddToCart = () => { /* ... existing function ... */ };

  return (
    <div className="py-12 bg-brand-white md:py-20">
      <audio ref={audioRef} src="/Assets/epic1.mp3" loop muted={isMuted} />
      
      {/*
        ====================================================================
          CHANGE 2: Adjusted the gap to be smaller on mobile (gap-8)
          and larger on desktop (md:gap-12).
        ====================================================================
      */}
      <div className="container grid items-start gap-8 px-6 mx-auto md:grid-cols-2 md:gap-12">
        {/* --- IMAGE GALLERY --- */}
        {/*
          ====================================================================
            CHANGE 1: Made the sticky positioning responsive.
            `md:sticky` and `md:top-28` ensure it only applies on screens
            medium and larger, fixing the mobile scrolling issue.
          ====================================================================
        */}
        <div className="flex flex-col gap-4 md:sticky md:top-28">
          <div className="relative w-full overflow-hidden bg-gray-100 rounded-lg aspect-square">
            <Image
              src={selectedImage.url}
              alt={`${productData.name} - ${selectedColor.name}`}
              fill
              style={{objectFit: 'cover'}}
              className="transition-opacity duration-300"
              key={selectedImage.id}
            />
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="absolute p-3 text-black transition-colors rounded-full bottom-4 right-4 bg-white/50 backdrop-blur-sm hover:bg-white"
              aria-label={isMuted ? "Unmute sound" : "Mute sound"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {productData.images.map(image => (
              <button 
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className={`relative aspect-square w-full bg-gray-100 rounded-md overflow-hidden ring-2 transition ${selectedImage.id === image.id ? 'ring-primary' : 'ring-transparent hover:ring-gray-300'}`}
              >
                <Image src={image.url} alt={`Thumbnail ${image.id}`} fill style={{objectFit: 'cover'}} />
              </button>
            ))}
          </div>
        </div>

        {/* --- PRODUCT DETAILS --- */}
        <div>
          <h1 className="text-4xl font-extrabold text-black md:text-5xl">{productData.name}</h1>
          <p className="my-4 text-3xl font-bold text-primary">${productData.price.toFixed(2)}</p>
          <p className="leading-relaxed text-gray-700">{productData.description}</p>
          
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

          {/*
            ====================================================================
              CHANGE 3: Made the action buttons stack vertically on mobile
              (`flex-col`) and switch to a row layout on larger screens (`sm:flex-row`).
            ====================================================================
          */}
          <div className="flex flex-col items-center gap-4 mt-8 sm:flex-row">
            <div className="flex items-center w-full border border-gray-300 rounded-md sm:w-auto">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 text-gray-600 hover:bg-gray-100"><Minus size={16} /></button>
              <span className="w-full px-5 font-semibold text-center text-black">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="p-3 text-gray-600 hover:bg-gray-100"><Plus size={16} /></button>
            </div>
            <button 
              onClick={handleAddToCart}
              className="w-full py-4 text-base font-bold tracking-wider text-white uppercase transition-colors duration-300 rounded-md sm:flex-grow bg-accent hover:bg-red-500"
            >
              Add to Cart
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