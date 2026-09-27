// src/app/components/landing/FeaturedProducts.tsx

"use client";

import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MoveRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProductCard } from '@/app/components/ProductCard';
import { preloadProductVideos } from '@/lib/video-preloader';

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
  shipping_cost?: string | number | null;
  variants: ProductVariant[];
};


const FeaturedProducts = () => {
  // Refs for GSAP animations
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // State for products
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const leadVariant = products[0]?.variants[0];
  const collectionImage = leadVariant?.images?.find((media) => !/\.(mp4|webm|ogg|mov|m4v)$/i.test(media.url))?.url
    || (leadVariant?.thumbnailUrl && !/\.(mp4|webm|ogg|mov|m4v)$/i.test(leadVariant.thumbnailUrl)
      ? leadVariant.thumbnailUrl
      : '/images/H123.JPG');

  // Fetch featured products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/featured-products');
        if (response.ok) {
          const data = await response.json();
          const fetchedProducts = data.products || [];
          setProducts(fetchedProducts);
          
          // Preload videos in the background for faster loading on product pages
          if (fetchedProducts.length > 0) {
            preloadProductVideos(fetchedProducts);
          }
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
    <section ref={sectionRef} className="relative overflow-hidden bg-brand-black py-16 text-white md:py-20">
      <div className="container mx-auto flex h-full flex-col justify-center px-6">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
          <div>
            <p className="gsap-header-item text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Made to be worn
            </p>
            <h2 className="gsap-header-item mt-2 text-3xl font-bold uppercase leading-none sm:text-4xl md:text-5xl">
              Latest drops
            </h2>
            <p className="gsap-header-item mt-2 max-w-md text-sm text-gray-400 sm:text-base">
              Everyday essentials, cut with intention.
            </p>
          </div>
          <Link href="/shop" className="group hidden items-center gap-2 border-b border-white/25 pb-2 text-sm font-semibold text-white transition-colors hover:border-primary hover:text-primary md:flex gsap-header-item">
            <span>View All Products</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="w-full overflow-x-auto overscroll-behavior-x-contain pb-3 modern-scrollbar">
          <div ref={trackRef} className="flex items-stretch gap-4 pr-6 w-max md:gap-5 md:pr-0">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="w-[min(78vw,17rem)] flex-shrink-0 animate-pulse bg-white p-3">
                    <div className="aspect-[3/4] w-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
                    <div className="mt-3 space-y-2">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300"></div>
                      <div className="h-4 w-4/5 bg-gradient-to-r from-gray-200 to-gray-300"></div>
                      <div className="h-9 w-full bg-gradient-to-r from-gray-200 to-gray-300"></div>
                    </div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map((product, index) => (
                <div key={`featured-product-${product.id}-${index}`} className="w-[min(78vw,17rem)] flex-shrink-0">
                  <ProductCard product={product} featured />
                </div>
              ))
            ) : (
              // No products fallback
              <div className="flex min-h-[480px] w-[min(78vw,17rem)] flex-shrink-0 items-center justify-center border border-white/10 bg-white/[0.04] p-8 text-center text-gray-400">
                <div className="space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center border border-white/15 bg-white/5">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-medium text-white">No featured products yet</p>
                  <Link href="/shop" className="inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold text-primary">Browse the collection <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </div>
            )}
            
            <div className="relative flex w-[min(78vw,17rem)] flex-shrink-0 self-stretch">
              <Link href="/shop" className="group relative flex min-h-full w-full flex-col justify-between overflow-hidden border border-white/15 bg-[#151515] p-5 transition-colors duration-300 hover:border-primary/70 hover:bg-[#1b1b1b] sm:p-6">
                <Image
                  src={collectionImage}
                  alt="Featured CEASAR apparel"
                  fill
                  sizes="(max-width: 640px) 78vw, 272px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
                <div className="flex items-center justify-between">
                  <span className="relative z-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">The full collection</span>
                  <MoveRight className="relative z-10 h-5 w-5 text-primary transition-transform duration-300 group-hover:translate-x-1" />
                </div>
                <div className="relative z-10">
                  <p className="text-2xl font-semibold uppercase leading-[0.95] text-white sm:text-3xl">Find your<br />next uniform.</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">Every cut. Every color. Built for the everyday.</p>
                  <span className="mt-5 inline-flex items-center gap-2 border-b border-primary pb-2 text-sm font-semibold text-primary">
                    Shop all pieces
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
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