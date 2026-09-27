// src/app/components/landing/FeaturedProducts.tsx

"use client";

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, MoveRight } from 'lucide-react';
import { ProductCard } from '@/app/components/ProductCard';
import { preloadProductVideos } from '@/lib/video-preloader';

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
  const trackRef = useRef<HTMLDivElement>(null);
  
  // State for products
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
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

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateControls = () => {
      setCanScrollPrevious(track.scrollLeft > 4);
      setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
    };

    updateControls();
    track.addEventListener('scroll', updateControls, { passive: true });
    const resizeObserver = new ResizeObserver(updateControls);
    resizeObserver.observe(track);
    if (track.parentElement) resizeObserver.observe(track.parentElement);

    return () => {
      track.removeEventListener('scroll', updateControls);
      resizeObserver.disconnect();
    };
  }, [loading, products.length]);

  const scrollProducts = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>('[data-featured-card]');
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * ((firstCard?.offsetWidth || track.clientWidth) + gap),
      behavior: 'smooth',
    });
  };

  const cardWidth = 'w-[min(78vw,17rem)] sm:w-[min(44vw,18rem)] lg:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)]';

  return (
    <section className="bg-brand-black py-14 text-white md:py-16">
      <div className="container mx-auto flex flex-col justify-center px-6">
        <div className="mb-7 flex items-end justify-between gap-6 md:mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Made to be worn
            </p>
            <h2 className="mt-2 text-3xl font-bold uppercase leading-none sm:text-4xl md:text-5xl">
              Latest drops
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-400 sm:text-base">
              Everyday essentials, cut with intention.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/shop" className="group hidden items-center gap-2 border-b border-white/25 pb-2 text-sm font-semibold text-white transition-colors hover:border-primary hover:text-primary sm:flex">
              <span>View all</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <div className="hidden gap-2 lg:flex">
              <button type="button" onClick={() => scrollProducts(-1)} disabled={!canScrollPrevious} aria-label="Scroll products left" title="Previous products" className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition hover:border-white/50 disabled:cursor-default disabled:opacity-30">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => scrollProducts(1)} disabled={!canScrollNext} aria-label="Scroll products right" title="Next products" className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition hover:border-white/50 disabled:cursor-default disabled:opacity-30">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div
            ref={trackRef}
            className="flex w-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-5"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div data-featured-card key={`skeleton-${index}`} className={`${cardWidth} snap-start flex-shrink-0 animate-pulse bg-white p-3`}>
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
                <div data-featured-card key={`featured-product-${product.id}-${index}`} className={`${cardWidth} snap-start flex-shrink-0`}>
                  <ProductCard product={product} featured />
                </div>
              ))
            ) : (
              <div data-featured-card className={`${cardWidth} snap-start flex-shrink-0 border border-white/10 bg-white/[0.04] p-6 text-center text-gray-400`}>
                <div className="space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center border border-white/15 bg-white/5">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-medium text-white">No featured products yet</p>
                  <Link href="/shop" className="inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold text-primary">Browse the collection <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </div>
            )}
            
            <div data-featured-card className={`${cardWidth} snap-start flex flex-shrink-0`}>
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