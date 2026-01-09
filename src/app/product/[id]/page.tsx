"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";

// Types
interface StockItem {
  id: string;
  size: string;
  stock: number;
}

interface VariantImage {
  id: string;
  url: string;
  displayOrder?: number;
}

interface ProductVariant {
  variantId: string;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  colorName: string;
  colorHex: string;
  images: VariantImage[] | null;
  stock: StockItem[] | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  audio_url?: string;
  variants: ProductVariant[];
}

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
}

// Utility function to check if URL is a video
const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(url);

// Train-style Media Showcase Component (Gucci-style)
function TrainMediaShowcase({
  media,
  productName,
  onClose,
  hasAudio,
  isAudioPlaying,
  onToggleAudio,
}: {
  media: MediaItem[];
  productName: string;
  onClose?: () => void;
  hasAudio?: boolean;
  isAudioPlaying?: boolean;
  onToggleAudio?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Find the index of the first image (after videos)
  const firstImageIndex = media.findIndex((item) => item.type === "image");

  // Slide to a specific index with GSAP animation
  const slideTo = useCallback(
    (targetIndex: number) => {
      if (isAnimating || targetIndex < 0 || targetIndex >= media.length) return;
      if (targetIndex === currentIndex) return;

      setIsAnimating(true);
      const track = trackRef.current;
      if (!track) return;

      // Check if we're moving to/from the first image (not videos)
      const movingFromFirstImage = currentIndex === firstImageIndex;
      const movingToFirstImage = targetIndex === firstImageIndex;
      
      // Get the first image element (if it exists)
      const firstImageElement = firstImageIndex >= 0 ? track.children[firstImageIndex] as HTMLElement : null;

      // Create GSAP timeline
      const tl = gsap.timeline({
        onComplete: () => {
          setCurrentIndex(targetIndex);
          setIsAnimating(false);
        },
      });

      // Helper to calculate offset - for paired image views, we show [targetIndex-1, targetIndex]
      const calculateOffset = (target: number, firstImgWidth: number): number => {
        let offset = 0;
        
        // If target is an image (not video) and not the first image, show paired view
        const targetIsImage = media[target]?.type === "image";
        const showPaired = targetIsImage && target > firstImageIndex;
        
        // Calculate the position we need to scroll to
        const stopIndex = showPaired ? target - 1 : target;
        
        for (let i = 0; i < stopIndex; i++) {
          if (media[i]?.type === "video") {
            offset += 100;
          } else if (i === firstImageIndex) {
            offset += firstImgWidth;
          } else {
            offset += 50;
          }
        }
        return offset;
      };

      if (movingFromFirstImage && !movingToFirstImage && firstImageElement) {
        // Moving FROM first image - shrink it to 50vw
        tl.to(
          firstImageElement,
          {
            width: "50vw",
            duration: 0.7,
            ease: "power3.inOut",
          },
          0
        );
        
        // Calculate offset with first image as 50vw
        const newOffset = calculateOffset(targetIndex, 50);
        
        tl.to(
          track,
          {
            x: `-${newOffset}vw`,
            duration: 0.7,
            ease: "power3.inOut",
          },
          0
        );
      } else if (movingToFirstImage && !movingFromFirstImage && firstImageElement) {
        // Moving TO first image - expand it to 100vw
        const newOffset = calculateOffset(firstImageIndex, 100);
        
        tl.to(
          track,
          {
            x: `-${newOffset}vw`,
            duration: 0.7,
            ease: "power3.inOut",
          },
          0
        );
        tl.to(
          firstImageElement,
          {
            width: "100vw",
            duration: 0.7,
            ease: "power3.inOut",
          },
          0
        );
      } else {
        // Moving between videos or between paired image views
        const firstImgWidth = currentIndex === firstImageIndex ? 100 : 50;
        const newOffset = calculateOffset(targetIndex, firstImgWidth);
        
        tl.to(track, {
          x: `-${newOffset}vw`,
          duration: 0.6,
          ease: "power3.inOut",
        });
      }
    },
    [currentIndex, isAnimating, firstImageIndex, media]
  );

  // Navigation handlers
  const goNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      slideTo(currentIndex + 1);
    }
  }, [currentIndex, media.length, slideTo]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      slideTo(currentIndex - 1);
    }
  }, [currentIndex, slideTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // Touch/swipe handling
  const touchStartX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Toggle mute for videos
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      videoRefs.current.forEach((video) => {
        video.muted = newMuted;
      });
      return newMuted;
    });
  }, []);

  // Get width for each media item
  // Videos: always 100vw (full screen)
  // First image: 100vw when viewing it (full screen alone)
  // All other images: 50vw (paired view)
  const getItemWidth = (index: number): string => {
    // Videos are always full screen
    if (media[index]?.type === "video") {
      return "100vw";
    }
    
    // Find the index of the first image in the media array
    const firstImageIndex = media.findIndex((item) => item.type === "image");
    
    // First image is full screen when viewing it
    if (index === firstImageIndex && currentIndex === firstImageIndex) {
      return "100vw";
    }
    return "50vw";
  };

  if (!media || media.length === 0) {
    return (
      <div className="w-full h-screen bg-[#f5f5f5] flex items-center justify-center">
        <p className="text-neutral-400">No media available</p>
      </div>
    );
  }

  const hasMultipleImages = media.length > 1;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-[#f5f5f5] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Breadcrumb Navigation - Top center of slider */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-2 px-5 py-2.5 bg-black/20 backdrop-blur-md rounded-full text-sm">
          <Link
            href="/shop"
            className="text-white/80 hover:text-white transition-colors"
          >
            Shop
          </Link>
          <ChevronRight className="w-4 h-4 text-white/50" />
          <span className="text-white font-medium max-w-[200px] truncate">
            {productName}
          </span>
        </nav>
      </div>

      {/* Audio Toggle Button (replaces Try it on) */}
      {hasAudio && onToggleAudio && (
        <button
          onClick={onToggleAudio}
          className="absolute bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm text-neutral-700 hover:shadow-md transition-shadow"
          aria-label={isAudioPlaying ? "Pause audio" : "Play audio"}
        >
          {isAudioPlaying ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          {isAudioPlaying ? "Pause Audio" : "Play Audio"}
        </button>
      )}

      {/* Media Track - Train Style */}
      <div
        ref={trackRef}
        className="flex h-full will-change-transform"
        style={{ transform: "translateX(0)" }}
      >
        {media.map((item, index) => (
          <div
            key={item.id}
            className="relative flex-shrink-0 h-full flex items-center justify-center"
            style={{ width: getItemWidth(index) }}
          >
            {item.type === "video" ? (
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(item.id, el);
                }}
                src={item.url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={item.url}
                  alt={`${productName} - View ${index + 1}`}
                  fill
                  className="object-contain"
                  sizes={index === firstImageIndex && currentIndex === firstImageIndex ? "100vw" : "50vw"}
                  priority={index < 3}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Thumbnail Navigation Bar - Bottom Right (Gucci style) */}
      {hasMultipleImages && (
        <div className="absolute bottom-6 right-6 z-50">
          <div className="flex items-center gap-1">
            {media.map((item, index) => {
              const isActive = index === currentIndex;
              // In paired mode, also highlight the previous image
              const isPaired = currentIndex > 0 && index === currentIndex - 1;

              return (
                <button
                  key={item.id}
                  onClick={() => slideTo(index)}
                  disabled={isAnimating}
                  className="group relative overflow-hidden transition-all duration-300"
                  aria-label={`View image ${index + 1}`}
                >
                  <div
                    className={`w-10 h-14 md:w-12 md:h-16 relative transition-all duration-300 border ${
                      isActive || isPaired
                        ? "border-neutral-900"
                        : "border-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    {item.type === "video" ? (
                      <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[6px] border-l-neutral-600 border-y-[4px] border-y-transparent ml-0.5" />
                      </div>
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    )}
                  </div>
                </button>
              );
            })}

            {/* Navigation arrows */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0 || isAnimating}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  currentIndex === 0 || isAnimating
                    ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-400 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
                }`}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                disabled={currentIndex === media.length - 1 || isAnimating}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  currentIndex === media.length - 1 || isAnimating
                    ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-400 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
                }`}
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Details Panel Component
function ProductDetailsPanel({
  product,
  selectedVariant,
  selectedSize,
  quantity,
  isAddingToCart,
  onVariantChange,
  onSizeChange,
  onQuantityChange,
  onAddToCart,
}: {
  product: Product;
  selectedVariant: ProductVariant;
  selectedSize: string | null;
  quantity: number;
  isAddingToCart: boolean;
  onVariantChange: (variant: ProductVariant) => void;
  onSizeChange: (size: string) => void;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
}) {
  const hasDiscount =
    selectedVariant.compareAtPrice &&
    selectedVariant.compareAtPrice > selectedVariant.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((selectedVariant.compareAtPrice! - selectedVariant.price) /
          selectedVariant.compareAtPrice!) *
          100
      )
    : 0;

  const selectedStock = selectedVariant.stock?.find(
    (s) => s.size === selectedSize
  );
  const isOutOfStock = selectedStock ? selectedStock.stock === 0 : true;
  const lowStock = selectedStock && selectedStock.stock <= 5 && selectedStock.stock > 0;
  const totalStock = selectedVariant.stock?.reduce((acc, s) => acc + s.stock, 0) || 0;

  return (
    <div className="bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
          
          {/* Left Side - Product Details (3 columns) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Product Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a] leading-tight mb-4">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-semibold text-[#1a1a1a]">
                  ${selectedVariant.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-base text-[#888] line-through">
                      ${selectedVariant.compareAtPrice!.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="px-2 py-0.5 bg-[#1a1a1a] text-white text-xs font-medium">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Signature stripe - Green White Red */}
            <div className="flex h-2 w-full border border-[#1a1a1a] -mt-4">
              <div className="flex-1 bg-[#006633]" />
              <div className="flex-1 bg-white" />
              <div className="flex-1 bg-[#cc0000]" />
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">Description</h3>
              {/* Divider */}
              <div className="h-px bg-[#e5e5e5] mb-4" />
              <div 
                className="text-[15px] text-[#444] leading-[1.8] 
                  [&_b]:font-semibold [&_b]:text-[#1a1a1a]
                  [&_strong]:font-semibold [&_strong]:text-[#1a1a1a]
                  [&_p]:mb-4
                  [&_ul]:space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:marker:text-[#1a1a1a] [&_ul]:marker:text-lg
                  [&_li]:text-[#444] [&_li]:pl-1
                  [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#1a1a1a] [&_h3]:mt-6 [&_h3]:mb-3
                  [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-[#1a1a1a] [&_h4]:mt-4 [&_h4]:mb-2"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>

            {/* Divider
            <div className="h-px bg-[#e5e5e5]" />

            Shipping & Returns - Collapsible
            <div>
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none py-2">
                  <span className="text-sm font-medium text-[#1a1a1a] uppercase tracking-wider">Shipping & Returns</span>
                  <svg 
                    className="w-4 h-4 text-[#666] transition-transform duration-200 group-open:rotate-180" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="pt-4 pb-2 space-y-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#1a1a1a] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">Free Shipping</p>
                      <p className="text-sm text-[#666]">On orders over $100. Delivery in 3-5 business days.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#1a1a1a] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">Free Returns</p>
                      <p className="text-sm text-[#666]">Return within 30 days for a full refund.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#1a1a1a] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">Secure Payment</p>
                      <p className="text-sm text-[#666]">Your payment information is encrypted.</p>
                    </div>
                  </div>
                </div>
              </details>
            </div> */}
          </div>

          {/* Right Side - Purchase Options (2 columns) */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 bg-white border border-[#e5e5e5] p-6 space-y-6">
              {/* Price on mobile/tablet - hidden on desktop */}
              <div className="lg:hidden pb-4 border-b border-[#e5e5e5]">
                <div className="flex items-baseline gap-3">
                  <span className="text-xl font-semibold text-[#1a1a1a]">
                    ${selectedVariant.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-[#888] line-through">
                      ${selectedVariant.compareAtPrice!.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Color Selection */}
              {product.variants.length > 1 && (
                <div>
                  <p className="text-sm text-[#666] mb-3">
                    Color: <span className="text-[#1a1a1a] font-medium">{selectedVariant.colorName}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const isSelected = variant.variantId === selectedVariant.variantId;
                      return (
                        <button
                          key={variant.variantId}
                          onClick={() => onVariantChange(variant)}
                          className={`w-10 h-10 rounded-full transition-all ${
                            isSelected
                              ? "ring-2 ring-[#1a1a1a] ring-offset-2"
                              : "ring-1 ring-[#ddd] hover:ring-[#999]"
                          }`}
                          style={{ backgroundColor: variant.colorHex || "#888" }}
                          aria-label={`Select ${variant.colorName}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {selectedVariant.stock && selectedVariant.stock.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-[#666]">
                      Size: <span className="text-[#1a1a1a] font-medium">{selectedSize || "Select"}</span>
                    </p>
                    <Link
                      href="/size-guide"
                      className="text-xs text-[#1a1a1a] underline underline-offset-2 hover:no-underline"
                    >
                      Size guide
                    </Link>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedVariant.stock.map((stockItem) => {
                      const isAvailable = stockItem.stock > 0;
                      const isSelected = selectedSize === stockItem.size;

                      return (
                        <button
                          key={stockItem.id}
                          onClick={() => isAvailable && onSizeChange(stockItem.size)}
                          disabled={!isAvailable}
                          className={`py-3 text-sm font-medium border transition-colors ${
                            isSelected
                              ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                              : isAvailable
                              ? "bg-white text-[#1a1a1a] border-[#ddd] hover:border-[#1a1a1a]"
                              : "bg-[#f5f5f5] text-[#ccc] border-[#eee] cursor-not-allowed line-through"
                          }`}
                        >
                          {stockItem.size}
                        </button>
                      );
                    })}
                  </div>
                  {lowStock && selectedSize && (
                    <p className="text-xs text-[#c85000] mt-2">
                      Only {selectedStock?.stock} left in stock
                    </p>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div>
                <p className="text-sm text-[#666] mb-3">Quantity</p>
                <div className="flex items-center">
                  <button
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-[#ddd] flex items-center justify-center text-[#666] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 h-10 border-y border-[#ddd] flex items-center justify-center text-sm font-medium text-[#1a1a1a]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => onQuantityChange(Math.min(selectedStock?.stock || 10, quantity + 1))}
                    className="w-10 h-10 border border-[#ddd] flex items-center justify-center text-[#666] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add to Bag Button */}
              <button
                onClick={onAddToCart}
                disabled={isOutOfStock || !selectedSize || isAddingToCart}
                className={`w-full py-4 text-sm font-medium tracking-wide uppercase transition-colors flex items-center justify-center gap-2 ${
                  isOutOfStock || !selectedSize || isAddingToCart
                    ? "bg-[#e5e5e5] text-[#999] cursor-not-allowed"
                    : "bg-[#1a1a1a] text-white hover:bg-[#333]"
                }`}
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : isOutOfStock ? (
                  "Sold Out"
                ) : !selectedSize ? (
                  "Select a Size"
                ) : (
                  "Add to Bag"
                )}
              </button>

              {/* Wishlist Button */}
              {/* <button
                className="w-full py-3 text-sm font-medium border border-[#ddd] flex items-center justify-center gap-2 text-[#1a1a1a] hover:border-[#1a1a1a] transition-colors"
                aria-label="Add to wishlist"
              >
                <Heart className="w-4 h-4" />
                Add to Wishlist
              </button> */}

              {/* Stock Alert */}
              {totalStock > 0 && totalStock <= 10 && (
                <p className="text-xs text-center text-[#c85000]">
                  ⚡ Low stock – only {totalStock} items left
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Product Page Component
export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  // Cart and Auth contexts
  const { addToCart, openCart } = useCart();
  const { user } = useAuth();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/products/${productId}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError("Product not found");
          } else {
            setError("Failed to load product");
          }
          return;
        }

        const data = await res.json();
        setProduct(data);

        // Set default variant
        if (data.variants && data.variants.length > 0) {
          const defaultVariant = data.variants[0];
          setSelectedVariant(defaultVariant);
          
          // Auto-select first available size
          const firstAvailableSize = defaultVariant.stock?.find(
            (s: StockItem) => s.stock > 0
          )?.size;
          if (firstAvailableSize) {
            setSelectedSize(firstAvailableSize);
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product");
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Auto-play product audio when page loads
  useEffect(() => {
    if (product?.audio_url && !isLoading) {
      // Create audio element
      const audio = new Audio(product.audio_url);
      audio.loop = true;
      audio.volume = 0.5;
      audioRef.current = audio;

      // Try to auto-play (may be blocked by browser)
      const playAudio = async () => {
        try {
          await audio.play();
          setIsAudioPlaying(true);
        } catch {
          // Auto-play blocked, user needs to interact first
          console.log("Auto-play blocked, waiting for user interaction");
          setIsAudioPlaying(false);
        }
      };

      playAudio();

      // Cleanup on unmount
      return () => {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    }
  }, [product?.audio_url, isLoading]);

  // Toggle audio play/pause
  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;

    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
      }).catch(console.error);
    }
  }, [isAudioPlaying]);

  // Prepare media items from selected variant (videos first, then images sorted by displayOrder)
  const mediaItems: MediaItem[] = useMemo(() => {
    if (!selectedVariant?.images) return [];

    // Separate videos and images
    const videos: MediaItem[] = [];
    const images: MediaItem[] = [];

    // Sort all items by displayOrder first
    const sortedItems = [...selectedVariant.images].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );

    // Separate into videos and images
    sortedItems.forEach((img) => {
      const item: MediaItem = {
        id: img.id,
        url: img.url,
        type: isVideoUrl(img.url) ? "video" : "image",
      };
      
      if (item.type === "video") {
        videos.push(item);
      } else {
        images.push(item);
      }
    });

    // Videos first, then images
    return [...videos, ...images];
  }, [selectedVariant]);

  // Handle variant change - reset size selection
  const handleVariantChange = useCallback((variant: ProductVariant) => {
    setSelectedVariant(variant);
    setQuantity(1);
    
    // Auto-select first available size for new variant
    const firstAvailableSize = variant.stock?.find((s) => s.stock > 0)?.size;
    setSelectedSize(firstAvailableSize || null);
  }, []);

  // Handle add to cart
  const handleAddToCart = useCallback(async () => {
    if (!product || !selectedVariant || !selectedSize) return;

    // Check if user is logged in
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }

    // Find the stock item (SKU) for the selected size
    const selectedSku = selectedVariant.stock?.find(
      (s) => s.size === selectedSize
    );
    
    if (!selectedSku) {
      alert("Please select a valid size.");
      return;
    }

    if (selectedSku.stock <= 0) {
      alert("This size is out of stock.");
      return;
    }

    setIsAddingToCart(true);
    
    try {
      const success = await addToCart(selectedSku.id, quantity);
      
      if (success) {
        openCart(); // Open cart drawer to show added item
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
      alert("Could not add item to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, selectedVariant, selectedSize, quantity, user, router, addToCart, openCart]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#f5f5f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          <p className="text-neutral-500 text-sm tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="fixed inset-0 bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-neutral-900 text-2xl font-light mb-4">
            {error || "Product not found"}
          </h1>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Train-style Media Showcase */}
      {mediaItems.length > 0 ? (
        <TrainMediaShowcase
          media={mediaItems}
          productName={product.name}
          hasAudio={!!product.audio_url}
          isAudioPlaying={isAudioPlaying}
          onToggleAudio={toggleAudio}
        />
      ) : (
        <div className="w-full h-screen bg-[#f5f5f5] flex items-center justify-center">
          <p className="text-neutral-400">No images available</p>
        </div>
      )}

      {/* Product Details Section - Below Images */}
      {selectedVariant && (
        <ProductDetailsPanel
          product={product}
          selectedVariant={selectedVariant}
          selectedSize={selectedSize}
          quantity={quantity}
          isAddingToCart={isAddingToCart}
          onVariantChange={handleVariantChange}
          onSizeChange={setSelectedSize}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
