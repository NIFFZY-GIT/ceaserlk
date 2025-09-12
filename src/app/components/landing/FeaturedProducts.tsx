// src/app/components/landing/FeaturedProducts.tsx

"use client";

import { useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProductCard } from '@/app/components/ProductCard';

gsap.registerPlugin(ScrollTrigger);

// --- FIX 1: Ensure all product IDs are unique ---
const featuredProducts = [
    { id: 1, name: 'Conquer Tee', price: 35.00, salePrice: 29.99, images: [{image_id: 1, url: '/images/image.jpg', color_id: null}, {image_id: 2, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 1, name: 'Black', hex_code: '#000000' }, { color_id: 2, name: 'White', hex_code: '#FFFFFF' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 10, 'M': 15, 'L': 0, 'XL': 5 } },
    { id: 2, name: 'Unleash Tee', price: 29.99, salePrice: null, images:  [{image_id: 3, url: '/images/image.jpg', color_id: null}, {image_id: 4, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 3, name: 'Forest Green', hex_code: '#107D3F' }, { color_id: 1, name: 'Black', hex_code: '#000000' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 8, 'M': 10, 'L': 12, 'XL': 3 } },
    { id: 3, name: 'Grind Tee', price: 39.99, salePrice: 29.99, images:  [{image_id: 5, url: '/images/image.jpg', color_id: null}, {image_id: 6, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 4, name: 'Crimson Red', hex_code: '#EF3D4C' }, { color_id: 2, name: 'White', hex_code: '#FFFFFF' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 0, 'M': 1, 'L': 0, 'XL': 0 } },
    { id: 4, name: 'Hustle Tee', price: 29.99, salePrice: null, images: [{image_id: 7, url: '/images/image.jpg', color_id: null}, {image_id: 8, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 1, name: 'Black', hex_code: '#000000' }, { color_id: 3, name: 'Forest Green', hex_code: '#107D3F' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 0, 'M': 0, 'L': 5, 'XL': 8 } },
    { id: 5, name: 'Dominate Hoodie', price: 59.99, salePrice: null, images: [{image_id: 9, url: '/images/image.jpg', color_id: null}, {image_id: 10, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 1, name: 'Black', hex_code: '#000000' }, { color_id: 3, name: 'Forest Green', hex_code: '#107D3F' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 0, 'M': 0, 'L': 5, 'XL': 8 } },
    { id: 6, name: 'Legacy Joggers', price: 49.99, salePrice: null, images: [{image_id: 11, url: '/images/image.jpg', color_id: null}, {image_id: 12, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 1, name: 'Black', hex_code: '#000000' }, { color_id: 3, name: 'Forest Green', hex_code: '#107D3F' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 0, 'M': 0, 'L': 5, 'XL': 8 } },
    { id: 7, name: 'Apex Shorts', price: 39.99, salePrice: null, images: [{image_id: 13, url: '/images/image.jpg', color_id: null}, {image_id: 14, url: '/images/image1.jpg', color_id: null}], colors: [{ color_id: 1, name: 'Black', hex_code: '#000000' }, { color_id: 3, name: 'Forest Green', hex_code: '#107D3F' }], sizes: ['S', 'M', 'L', 'XL'], stock: { 'S': 0, 'M': 0, 'L': 5, 'XL': 8 } },
];


const FeaturedProducts = () => {
  // Your TypeScript types for the refs are incorrect, let's fix them.
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null); // Ref for the horizontal track

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const track = trackRef.current;
      
      if (!section || !track) return;
      
      // Using gsap.matchMedia for responsive animations is best practice
      const mm = gsap.matchMedia();
  
      // Add a media query for desktop screens where the animation should run
      mm.add("(min-width: 1024px)", () => {
          if (!track.parentElement) return;
          const amountToScroll = track.scrollWidth - track.parentElement.offsetWidth;
  
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              pin: true,
              start: 'top top',
              end: () => `+=${amountToScroll}`,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
  
          tl.from(".gsap-header-item", { y: 50, opacity: 0, duration: 0.5, ease: 'power5.out', stagger: 0.2 });
          tl.to(track, { x: -amountToScroll, ease: 'power1.inOut' }, ">-0.2");
      });
    }, sectionRef); // scope the context to the section

    return () => ctx.revert(); // cleanup
  }, []);

  return (
    <section ref={sectionRef} className="py-24 overflow-hidden text-white bg-brand-black md:py-32">
      <div className="container flex flex-col justify-center h-full px-6 mx-auto">
        <div className="flex items-end justify-between mb-16">
          <div>
            <h2 className="text-4xl font-bold tracking-wider uppercase md:text-5xl gsap-header-item">
              Our Latest Drops
            </h2>
            <p className="mt-2 text-lg text-gray-400 gsap-header-item">
              Designs forged in the spirit of ambition.
            </p>
          </div>
          <Link href="/shop" className="items-center hidden gap-2 font-semibold md:flex text-primary group gsap-header-item">
            <span>View All Products</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="w-full pb-4 -mb-4 overflow-x-auto overscroll-behavior-x-contain modern-scrollbar">
          <div ref={trackRef} className="flex gap-8 pr-6 w-max md:pr-0">
            {/* --- FIX 2: Use the array index to create a guaranteed unique key --- */}
            {featuredProducts.map((product, index) => (
              <div key={`featured-product-${product.id}-${index}`} className="flex-shrink-0 w-64 p-4 transition-transform duration-300 bg-white shadow-lg rounded-xl md:w-80 hover:-translate-y-2">
                <ProductCard product={product} />
              </div>
            ))}
            <div className="flex items-center justify-center flex-shrink-0 w-64 md:w-80">
              <Link href="/shop" className="flex flex-col items-center justify-center w-full h-full transition-colors duration-300 border-2 border-gray-600 border-dashed bg-gray-900/50 rounded-xl group hover:bg-primary hover:border-primary">
                 <span className="text-xl font-bold text-center text-white">Explore the<br/>Full Collection</span>
                  <div className="flex items-center gap-2 mt-4 font-semibold text-primary group-hover:text-white">
                    <span>View All</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    
    </section>
  );
};

export default FeaturedProducts;