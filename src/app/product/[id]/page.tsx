"use client";

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Loader2, ChevronDown, Heart, Share2, Shield, X, Volume2, VolumeX, Video } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { gsap } from 'gsap';

// --- (All type definitions remain the same) ---
type StockInfo = { id: string; size: string; stock: number };
type MediaInfo = { id: string; url: string };
type Variant = {
  variantId: string;
  price: string;
  compareAtPrice: string | null;
  colorName: string;
  colorHex: string;
  images: MediaInfo[];
  stock: StockInfo[];
};
type Product = {
  id: string;
  name: string;
  description: string;
  audio_url: string | null;
  variants: Variant[];
};

const VIDEO_EXTENSION_REGEX = /\.(mp4|webm|ogg|mov|m4v)$/i;
const isVideoUrl = (url: string) => VIDEO_EXTENSION_REGEX.test(url);

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { addToCart, openCart, error, clearError } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Unwrap params using React.use()
  const { id } = use(params);
  
  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [product, setProduct] = useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedSize, setSelectedSize] = useState<StockInfo | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaInfo | null>(null);
  const [loadedMediaId, setLoadedMediaId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // Audio player state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // Fake stock drop system
  const [fakeStockReduction, setFakeStockReduction] = useState(0);
  const stockDropIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showStockDropAlert, setShowStockDropAlert] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState<string[]>([]);
  const lastAlertAtRef = useRef<number>(0);
  const lastDropAtRef = useRef<number>(0);

  // Entrance animations - Optimized to prevent double animation
  useEffect(() => {
    if (!loading && product && containerRef.current && !containerRef.current.hasAttribute('data-animated')) {
      containerRef.current.setAttribute('data-animated', 'true');
      gsap.fromTo(containerRef.current.children, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [loading, product]);

  // Product fetching with variant URL parameter handling
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          if (res.status === 404) notFound();
          throw new Error('Failed to fetch product');
        }
        const data: Product = await res.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setProduct(data);
          
          if (data.variants && data.variants.length > 0) {
            // Check if there's a variant parameter in the URL
            const variantParam = searchParams.get('variant');
            let initialVariant = data.variants[0]; // Default to first variant
            
            // If variant parameter exists, try to find matching variant
            if (variantParam) {
              const matchedVariant = data.variants.find(v => v.variantId === variantParam);
              if (matchedVariant) {
                initialVariant = matchedVariant;
              }
            }
            
            setSelectedVariant(initialVariant);
            const initialMedia = initialVariant.images?.[0] || null;
            setSelectedMedia(initialMedia);
            setLoadedMediaId(null);
            setIsVideoMuted(true);
            setSelectedSize(initialVariant.stock?.find(s => s.stock > 0) || null);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchProduct();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, [id, searchParams]);

  // Preload images for the currently selected variant to reduce flicker
  const selectedVariantId = selectedVariant?.variantId;
  useEffect(() => {
    if (!selectedVariant || !selectedVariant.images) return;
    try {
      selectedVariant.images.forEach(asset => {
        if (isVideoUrl(asset.url)) return;
        const pre = new window.Image();
        pre.src = asset.url;
      });
    } catch {}
  }, [selectedVariant, selectedVariantId]);

  // Auto-play audio when product loads
  useEffect(() => {
    if (product?.audio_url && audioRef.current && !isAudioPlaying) {
      const playAudio = async () => {
        try {
          audioRef.current!.volume = isAudioMuted ? 0 : 0.5; // Set initial volume
          await audioRef.current!.play();
          setIsAudioPlaying(true);
        } catch (error) {
          console.log('Audio autoplay prevented by browser:', error);
        }
      };
      playAudio();
    }
  }, [product?.audio_url, isAudioMuted, isAudioPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isVideoMuted;
    }
  }, [isVideoMuted, selectedMedia]);

  useEffect(() => {
    if (selectedMedia && isVideoUrl(selectedMedia.url)) {
      setIsVideoMuted(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          try {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
          } catch {}
        }
      });
    } else if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }
  }, [selectedMedia]);

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    const nextMedia = variant.images?.[0] || null;
    setSelectedMedia(nextMedia);
    setLoadedMediaId(null);
    setIsVideoMuted(true);
    setSelectedSize(variant.stock?.find(s => s.stock > 0) || null);
    setQuantity(1);
    
    // Update URL without triggering a full page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('variant', variant.variantId);
    window.history.replaceState({}, '', newUrl.toString());
  };
  
  const handleAddToCart = async () => {
    // Check authentication first
    if (!user) {
      // Redirect to login page with current product page as return URL
      const returnUrl = `/product/${id}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!selectedSize || !selectedVariant) {
      // Animate error feedback
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          x: 10,
          duration: 0.1,
          yoyo: true,
          repeat: 3,
          ease: "power2.inOut"
        });
      }
      alert("Please select a size.");
      return;
    }
    
    setIsAdding(true);
    clearError(); // Clear any previous errors
    
    try {
      const success = await addToCart(selectedSize.id, quantity);
      
      if (success) {
        // Success animation
        gsap.to(".add-to-cart-btn", {
          scale: 1.05,
          duration: 0.2,
          yoyo: true,
          repeat: 1
        });
        openCart();
      } else {
        // Error animation for stock issues
        if (containerRef.current) {
          gsap.to(containerRef.current, {
            x: 10,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            ease: "power2.inOut"
          });
        }
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      // Error animation for other issues
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          x: 10,
          duration: 0.1,
          yoyo: true,
          repeat: 3,
          ease: "power2.inOut"
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Audio control functions
  const toggleProductAudioMute = () => {
    if (audioRef.current) {
      const newMutedState = !isAudioMuted;
      setIsAudioMuted(newMutedState);
      audioRef.current.volume = newMutedState ? 0 : 0.5;
    }
  };

  const toggleVideoMute = () => {
    if (!selectedMedia || !isVideoUrl(selectedMedia.url)) return;
    const nextMuted = !isVideoMuted;
    setIsVideoMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
  };

  // Fake stock drop system to create urgency (more realistic, less sudden)
  const startFakeStockDrop = useCallback(() => {
    if (stockDropIntervalRef.current) {
      clearTimeout(stockDropIntervalRef.current);
    }

    const toMilliseconds = (seconds: number) => Math.floor(seconds * 1000);
    const minDropGapMs = toMilliseconds(10);

    // Reset last drop tracker each time we restart the flow
    lastDropAtRef.current = 0;

    const scheduleNextDrop = () => {
      const minIntervalSeconds = 10;
      const maxIntervalSeconds = 20;
      const randomSeconds = minIntervalSeconds + Math.random() * (maxIntervalSeconds - minIntervalSeconds);
      const randomInterval = toMilliseconds(randomSeconds);

      stockDropIntervalRef.current = setTimeout(() => {
        setFakeStockReduction(prev => {
          const now = Date.now();
          const currentSelectedStock = selectedSize ? selectedSize.stock : 0;
          const effectiveStock = currentSelectedStock - prev;

          if (effectiveStock <= 2) {
            return prev;
          }

          if (now - lastDropAtRef.current < minDropGapMs) {
            scheduleNextDrop();
            return prev;
          }

          const dropChance = effectiveStock > 20 ? 0.65 : effectiveStock > 12 ? 0.5 : 0.35;
          const shouldDrop = Math.random() < dropChance;

          if (!shouldDrop) {
            scheduleNextDrop();
            return prev;
          }

          lastDropAtRef.current = now;
          const newReduction = prev + 1;

          const alertCooldown = toMilliseconds(12 + Math.random() * 10); // 12-22 seconds
          if (now - lastAlertAtRef.current > alertCooldown) {
            lastAlertAtRef.current = now;
            setShowStockDropAlert(true);
            setTimeout(() => setShowStockDropAlert(false), 3000 + Math.floor(Math.random() * 2000));
          }

          if (Math.random() < 0.4) {
            const cities = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Matara', 'Anuradhapura'];
            const timeAgo = ['about 2 minutes', '4 minutes', '7 minutes', '11 minutes', '15 minutes'];
            const city = cities[Math.floor(Math.random() * cities.length)];
            const time = timeAgo[Math.floor(Math.random() * timeAgo.length)];
            const newPurchase = `Someone in ${city} bought this ${time} ago`;
            setRecentPurchases(prevPurch => [newPurchase, ...prevPurch].slice(0, 3));
          }

          scheduleNextDrop();
          return newReduction;
        });
      }, randomInterval);
    };

    const initialDelaySeconds = 15 + Math.random() * 5; // 15-20 seconds before the first simulated drop
    stockDropIntervalRef.current = setTimeout(() => {
      scheduleNextDrop();
    }, toMilliseconds(initialDelaySeconds));
  }, [selectedSize]);

  // Start fake stock drop when product loads and has variants
  useEffect(() => {
    if (selectedVariant && selectedSize && selectedSize.stock > 2) {
      // Add some initial fake purchases when product loads
      const cities = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Matara'];
  const timeAgo = ['18 minutes', '26 minutes', '39 minutes', '55 minutes', 'about 1 hour'];
      const initialPurchases = [];
      
      for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const time = timeAgo[Math.floor(Math.random() * timeAgo.length)];
        initialPurchases.push(`Someone in ${city} bought this ${time} ago`);
      }
      
      setRecentPurchases(initialPurchases);
      startFakeStockDrop();
    }

    // Cleanup interval on unmount
    return () => {
      if (stockDropIntervalRef.current) {
        clearTimeout(stockDropIntervalRef.current);
      }
    };
  }, [selectedVariant, selectedSize, startFakeStockDrop]);

  // Reset fake stock when variant or size changes
  useEffect(() => {
    setFakeStockReduction(0);
    setRecentPurchases([]);
    setShowStockDropAlert(false);
    lastDropAtRef.current = 0;
    if (stockDropIntervalRef.current) {
      clearTimeout(stockDropIntervalRef.current);
    }
    
    // Restart fake stock drop for new selection
    if (selectedVariant && selectedSize && selectedSize.stock > 2) {
      startFakeStockDrop();
    }
  }, [selectedVariant, selectedSize, startFakeStockDrop]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!product || !selectedVariant) return notFound();

  // Derived values for clean JSX
  const price = parseFloat(selectedVariant.price);
  const compareAtPrice = selectedVariant.compareAtPrice ? parseFloat(selectedVariant.compareAtPrice) : null;
  const isOnSale = compareAtPrice && compareAtPrice > price;
  const originalStock = selectedSize ? selectedSize.stock : 0;
  const currentStockForSelectedSize = Math.max(0, originalStock - fakeStockReduction);
  const isSoldOut = selectedVariant.stock.reduce((sum, s) => sum + s.stock, 0) === 0;
  const isSelectedMediaVideo = selectedMedia ? isVideoUrl(selectedMedia.url) : false;

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200">
        <div className="container px-4 py-4 mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button className="transition-colors hover:text-gray-900">Home</button>
            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            <button className="transition-colors hover:text-gray-900">Shop</button>
            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            <span className="font-medium text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8 mx-auto sm:px-6 lg:py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          
          {/* Image Gallery */}
          <div ref={imageRef} className="space-y-4">
            {/* Main Media */}
            <div className="relative group">
              <div className="relative overflow-hidden bg-gray-50 rounded-2xl aspect-square">
                {selectedMedia ? (
                  <>
                    {isSelectedMediaVideo ? (
                      <video
                        key={selectedMedia.id}
                        ref={videoRef}
                        src={selectedMedia.url}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${loadedMediaId === selectedMedia.id ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
                        autoPlay
                        loop
                        muted={isVideoMuted}
                        playsInline
                        onLoadedData={() => setLoadedMediaId(selectedMedia.id)}
                      />
                    ) : (
                      <Image
                        src={selectedMedia.url}
                        alt={`${product.name} - ${selectedVariant.colorName}`}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className={`object-cover transition-all duration-500 group-hover:scale-105 ${loadedMediaId === selectedMedia.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                        onLoadingComplete={() => setLoadedMediaId(selectedMedia.id)}
                        placeholder="empty"
                      />
                    )}
                    {/* Overlay Icons */}
                    <div className="absolute flex gap-2 transition-opacity opacity-0 top-4 right-4 group-hover:opacity-100">
                      <button 
                        onClick={() => setIsWishlisted(!isWishlisted)}
                        className="p-2 transition-colors rounded-full shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white"
                      >
                        <Heart className={`${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'} w-5 h-5`} />
                      </button>
                      <button className="p-2 transition-colors rounded-full shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white">
                        <Share2 className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    {isSelectedMediaVideo && (
                      <button
                        type="button"
                        onClick={toggleVideoMute}
                        className="absolute flex items-center gap-2 px-3 py-1 text-xs font-semibold text-white transition-colors rounded-full bg-black/60 bottom-4 left-4 hover:bg-black/80"
                      >
                        {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        {isVideoMuted ? 'Muted' : 'Sound On'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-2xl" />
                )}

                {/* Sale Badge */}
                {isOnSale && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 text-sm font-bold text-white bg-red-500 rounded-full">
                      SALE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Grid */}
            {selectedVariant.images && selectedVariant.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {selectedVariant.images.map((media, index) => {
                  const isVideoThumb = isVideoUrl(media.url);
                  return (
                    <button
                      key={media.id}
                      onClick={() => {
                        setSelectedMedia(media);
                        setLoadedMediaId(null);
                        setIsVideoMuted(true);
                      }}
                      className={`relative overflow-hidden bg-gray-50 rounded-lg aspect-square border-2 transition-all ${
                        selectedMedia?.id === media.id 
                          ? 'border-black' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isVideoThumb ? (
                        <video
                          src={media.url}
                          className="object-cover w-full h-full"
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <Image 
                          src={media.url} 
                          alt={`View ${index + 1}`} 
                          fill 
                          className="object-cover"
                          sizes="(max-width: 768px) 25vw, 12.5vw" 
                        />
                      )}
                      {isVideoThumb && (
                        <span className="absolute inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white uppercase tracking-wide bg-black/70 rounded-full bottom-1 left-1">
                          <Video className="w-3 h-3" /> Video
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Product Details */}
          <div ref={detailsRef} className="flex flex-col justify-center space-y-8">
            {/* Product Title */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>
            </div>

            {/* Audio Player Controls */}
            {product.audio_url && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  {isAudioPlaying ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {isAudioPlaying ? 'Playing Audio' : 'Audio Ready'}
                  </span>
                </div>
                <button
                  onClick={toggleProductAudioMute}
                  className="flex items-center justify-center w-10 h-10 text-gray-600 transition-all bg-white border-2 border-gray-200 rounded-full hover:border-gray-300 hover:text-gray-900 hover:scale-105"
                  title={isAudioMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <audio 
                  ref={audioRef}
                  src={product.audio_url}
                  onEnded={handleAudioEnded}
                  onPlay={() => setIsAudioPlaying(true)}
                  onPause={() => setIsAudioPlaying(false)}
                  loop
                  preload="auto"
                />
              </div>
            )}
            
            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold text-gray-900">
                  LKR {price.toFixed(2)}
                </span>
                {isOnSale && compareAtPrice && (
                  <span className="text-2xl text-gray-500 line-through">
                    LKR {compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {isOnSale && compareAtPrice && (
                <div className="inline-block">
                  <span className="px-2 py-1 text-sm font-medium text-green-800 bg-green-100 rounded">
                    Save LKR {(compareAtPrice - price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Color Selection */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900">
                Color: <span className="font-semibold">{selectedVariant.colorName}</span>
              </h3>
              <div className="flex items-center gap-3">
                {product.variants.map((variant) => (
                  <button
                    key={variant.variantId}
                    onClick={() => handleVariantSelect(variant)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedVariant.variantId === variant.variantId
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: variant.colorHex }}
                    title={variant.colorName}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900">Size</h3>
                <button className="text-sm text-gray-600 underline hover:text-gray-900">
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {selectedVariant.stock.map((stockItem) => (
                  <button
                    key={stockItem.id}
                    onClick={() => setSelectedSize(stockItem)}
                    disabled={stockItem.stock <= 0}
                    className={`relative py-3 text-sm font-medium rounded-lg border transition-all ${
                      stockItem.stock <= 0
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                        : selectedSize?.id === stockItem.id
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-black'
                    }`}
                  >
                    {stockItem.size}
                    {stockItem.stock <= 0 && (
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-400 rotate-12"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              {/* Stock Drop Alert */}
              {showStockDropAlert && (
                <div className="p-3 text-sm font-medium text-red-800 border border-red-200 rounded-lg bg-red-50 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span>⚡ Stock level updated! Someone just purchased this item.</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 text-sm font-medium text-red-800 bg-red-100 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={clearError}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                {/* Quantity Selector */}
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 transition-colors hover:bg-gray-50"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 py-3 font-medium min-w-[50px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStockForSelectedSize, quantity + 1))}
                    disabled={quantity >= currentStockForSelectedSize}
                    className="p-3 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize || isSoldOut || isAdding}
                  className="flex-1 px-8 py-4 font-semibold text-white transition-colors bg-black rounded-lg add-to-cart-btn hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAdding ? (
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                  ) : isSoldOut ? (
                    'Sold Out'
                  ) : (
                    'Add to Cart'
                  )}
                </button>
              </div>
              
              {/* Stock Warning */}
              {selectedSize && currentStockForSelectedSize > 0 && currentStockForSelectedSize <= 10 && (
                <div className="space-y-2">
                  <p className={`text-sm font-bold ${
                    currentStockForSelectedSize <= 3 
                      ? 'text-red-600 animate-pulse' 
                      : currentStockForSelectedSize <= 5 
                        ? 'text-orange-600' 
                        : 'text-yellow-600'
                  }`}>
                    {currentStockForSelectedSize <= 3 
                      ? `🔥 ALMOST GONE! Only ${currentStockForSelectedSize} left - Order now!` 
                      : `⚡ Only ${currentStockForSelectedSize} left in stock - Don't miss out!`
                    }
                  </p>
                  
                  {/* Recent Purchase Notifications */}
                  {recentPurchases.length > 0 && (
                    <div className="space-y-1">
                      {recentPurchases.slice(0, 2).map((purchase, index) => (
                        <p key={index} className="p-2 text-xs text-gray-600 border-l-2 border-orange-400 rounded bg-gray-50">
                          🛒 {purchase}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Secure payments</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {/* <Truck className="w-4 h-4" /> */}
                {/* <span>Free shipping</span> */}
              </div>
            </div>

            {/* Product Information Accordion */}
            <Accordion.Root type="single" collapsible className="space-y-2">
              <Accordion.Item value="description" className="overflow-hidden border border-gray-200 rounded-lg">
                <Accordion.Header>
                  <Accordion.Trigger className="flex items-center justify-between w-full p-4 font-medium text-left transition-colors hover:bg-gray-50 group">
                    Product Details
                    <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden transition-all animate-slideDown data-[state=closed]:animate-slideUp">
                  <div className="p-4 pt-0 text-sm leading-relaxed text-gray-600">
                    <div dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }} />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="shipping" className="overflow-hidden border border-gray-200 rounded-lg">
                <Accordion.Header>
                  <Accordion.Trigger className="flex items-center justify-between w-full p-4 font-medium text-left transition-colors hover:bg-gray-50 group">
                    Shipping & Returns
                    <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden transition-all animate-slideDown data-[state=closed]:animate-slideUp">
                  <div className="p-4 pt-0">
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Free standard shipping on orders over LKR 10,000</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>30-day return policy for unworn items</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Express shipping available at checkout</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Items shipped within 1-2 business days</span>
                      </li>
                    </ul>
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="care" className="overflow-hidden border border-gray-200 rounded-lg">
                <Accordion.Header>
                  <Accordion.Trigger className="flex items-center justify-between w-full p-4 font-medium text-left transition-colors hover:bg-gray-50 group">
                    Care Instructions
                    <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden transition-all animate-slideDown data-[state=closed]:animate-slideUp">
                  <div className="p-4 pt-0">
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Machine wash cold with similar colors</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Do not bleach or use fabric softener</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Tumble dry low or hang to dry</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-1 mt-2 bg-gray-400 rounded-full"></div>
                        <span>Iron on low heat if needed</span>
                      </li>
                    </ul>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </div>
        </div>
      </div>
    </div>
  );
}