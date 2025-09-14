// src/app/components/landing/FeaturedProducts.tsx

"use client";

import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProductCard } from '@/app/components/ProductCardLanding';

gsap.registerPlugin(ScrollTrigger);

// Type definitions for the product structure
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


const FeaturedProducts = () => {
  // Refs for GSAP animations
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // State for products
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/featured-products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        } else {
          console.error('Failed to fetch featured products');
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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
    <section ref={sectionRef} className="overflow-hidden text-white py-28 bg-brand-black md:py-32">
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

        <div className="w-full pb-6 -mb-6 overflow-x-auto min-h-[640px] overscroll-behavior-x-contain modern-scrollbar">
          <div ref={trackRef} className="flex items-start gap-6 pr-8 w-max md:pr-0 md:gap-8">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="flex-shrink-0 bg-white shadow-xl w-80 h-[580px] rounded-2xl animate-pulse overflow-hidden border border-gray-100">
                  <div className="p-6">
                    <div className="w-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl aspect-square"></div>
                    <div className="mt-6 space-y-3">
                      <div className="h-6 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300"></div>
                      <div className="w-4/5 h-5 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300"></div>
                      <div className="w-3/5 rounded-full h-9 bg-gradient-to-r from-gray-200 to-gray-300"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map((product, index) => (
                <div key={`featured-product-${product.id}-${index}`} className="flex-shrink-0 transition-all duration-500 ease-out bg-white shadow-xl w-80 min-h-[580px] rounded-2xl hover:-translate-y-3 hover:shadow-2xl hover:shadow-black/10 group border border-gray-100/50 backdrop-blur-sm">
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              // No products fallback
              <div className="flex items-center justify-center flex-shrink-0 p-10 text-center text-gray-400 w-80 min-h-[480px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-200 rounded-full">
                    <ArrowRight className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-600">No featured products available</p>
                  <Link href="/shop" className="inline-block px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 rounded-full bg-primary hover:bg-primary-dark hover:shadow-lg">Browse all products</Link>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center flex-shrink-0 w-80 min-h-[580px]">
              <Link href="/shop" className="flex flex-col items-center justify-center w-full h-full transition-all duration-500 ease-out border-2 border-dashed border-gray-600/30 bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-sm rounded-2xl group hover:bg-gradient-to-br hover:from-primary/90 hover:to-primary-dark/90 hover:border-primary/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
                <div className="p-8 space-y-6 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto transition-all duration-300 rounded-full bg-white/10 group-hover:bg-white/20">
                    <ArrowRight className="w-8 h-8 transition-colors duration-300 text-primary group-hover:text-white" />
                  </div>
                  <span className="text-xl font-bold leading-tight text-center text-white">Explore the<br/>Full Collection</span>
                  <div className="flex items-center justify-center gap-3 px-6 py-3 font-semibold transition-all duration-300 rounded-full text-primary group-hover:text-white bg-white/10 group-hover:bg-white/20">
                    <span>View All</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
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