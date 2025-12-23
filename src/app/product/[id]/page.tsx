"use client";

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Loader2, ChevronDown, Heart, Share2, Shield, X, Volume2, VolumeX, Video, AlertTriangle, Sparkles, BellRing } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { gsap } from 'gsap';

// SECURITY: HTML sanitization to prevent XSS attacks via product descriptions
function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/data\s*:/gi, '');
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove svg tags and their content (can contain malicious scripts)
  sanitized = sanitized.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
  
  // Remove math tags (can be used for XSS via xlink:href)
  sanitized = sanitized.replace(/<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi, '');
  
  // Remove iframe, object, embed, form, input, and other dangerous tags
  sanitized = sanitized.replace(/<\s*\/?\s*(iframe|object|embed|form|input|button|textarea|select|link|meta|base|video|audio|source|track|applet|marquee|bgsound|blink|xml)[^>]*>/gi, '');
  
  // Remove xlink:href and other namespace-based attributes (used in SVG/MathML attacks)
  sanitized = sanitized.replace(/\s*xlink:href\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*href\s*=\s*["']\s*javascript[^"']*["']/gi, '');
  
  // Remove any remaining dangerous attributes
  sanitized = sanitized.replace(/\s*(style|srcdoc|formaction|action|xmlns)\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
}

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
  const [isAudioMuted, setIsAudioMuted] = useState(true); // Start muted for autoplay compatibility
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  
  // Lightbox/Zoom state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Reset zoom when changing images or closing lightbox
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [selectedMedia, isLightboxOpen]);
  
  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPanPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };
  
  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };
  
  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - panPosition.x, 
        y: e.touches[0].clientY - panPosition.y 
      });
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
      setPanPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!isLightboxOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft' && selectedVariant?.images && selectedVariant.images.length > 1) {
        const currentIndex = selectedVariant.images.findIndex(m => m.id === selectedMedia?.id);
        const prevIndex = currentIndex <= 0 ? selectedVariant.images.length - 1 : currentIndex - 1;
        setSelectedMedia(selectedVariant.images[prevIndex]);
        setLoadedMediaId(null);
      } else if (e.key === 'ArrowRight' && selectedVariant?.images && selectedVariant.images.length > 1) {
        const currentIndex = selectedVariant.images.findIndex(m => m.id === selectedMedia?.id);
        const nextIndex = currentIndex >= selectedVariant.images.length - 1 ? 0 : currentIndex + 1;
        setSelectedMedia(selectedVariant.images[nextIndex]);
        setLoadedMediaId(null);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };
    
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, selectedVariant, selectedMedia]);

  // Fake stock drop system
  const [fakeStockReduction, setFakeStockReduction] = useState(0);
  const stockDropIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showStockDropAlert, setShowStockDropAlert] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState<string[]>([]);
  const [hideUrgencyBanner, setHideUrgencyBanner] = useState(false);
  const [audioInteractionRequired, setAudioInteractionRequired] = useState(false);
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

  // Auto-play audio when product loads with graceful fallback for strict autoplay policies
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!product?.audio_url || !audioElement) return;

    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'mousemove'];
    let fallbackArmed = false;
    let fadeFrame: number | null = null;
    let hasUserInteracted = false;

    const cancelFade = () => {
      if (fadeFrame !== null) {
        cancelAnimationFrame(fadeFrame);
        fadeFrame = null;
      }
    };

    const fadeInVolume = (element: HTMLAudioElement, targetVolume: number, durationMs = 1000) => {
      cancelFade();
      const startTime = performance.now();
      const clampedTarget = Math.max(0, Math.min(1, targetVolume));

      const step = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - startTime) / durationMs));
        element.volume = Math.max(0, Math.min(1, clampedTarget * progress));
        if (progress < 1) {
          fadeFrame = requestAnimationFrame(step);
        } else {
          fadeFrame = null;
        }
      };

      fadeFrame = requestAnimationFrame(step);
    };

    const detachFallback = () => {
      if (!fallbackArmed) return;
      fallbackArmed = false;
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleInteraction, true);
      });
    };

    const armFallback = () => {
      if (fallbackArmed) return;
      fallbackArmed = true;
      interactionEvents.forEach(event => {
        window.addEventListener(event, handleInteraction, { once: true, capture: true });
      });
      setAudioInteractionRequired(true);
    };

    const attemptUnmute = () => {
      const element = audioRef.current;
      if (!element || element.paused) return;
      
      // Unmute and fade in volume
      element.muted = false;
      setIsAudioMuted(false);
      fadeInVolume(element, 0.5);
      setAudioInteractionRequired(false);
      detachFallback();
    };

    const attemptPlayback = async () => {
      const element = audioRef.current;
      if (!element) return;

      // Always start muted for autoplay compatibility
      element.muted = true;
      element.volume = 0;

      try {
        await element.play();
        setIsAudioPlaying(true);
        
        // Audio is now playing (muted). Arm the fallback to unmute on interaction.
        armFallback();
        
      } catch (error) {
        console.debug('Audio autoplay failed, waiting for user interaction:', error);
        armFallback();
      }
    };

    function handleInteraction() {
      if (hasUserInteracted) return;
      hasUserInteracted = true;
      
      const element = audioRef.current;
      if (!element) return;
      
      if (element.paused) {
        // Audio never started, try to play it now
        element.muted = false;
        element.volume = 0;
        element.play().then(() => {
          setIsAudioPlaying(true);
          setIsAudioMuted(false);
          fadeInVolume(element, 0.5);
          setAudioInteractionRequired(false);
        }).catch(() => {
          console.debug('Manual audio start also failed');
        });
      } else {
        // Audio is playing muted, unmute it
        attemptUnmute();
      }
      
      detachFallback();
    }

    // Start playback attempt
    attemptPlayback();

    return () => {
      cancelFade();
      detachFallback();
    };
  }, [product?.audio_url]);

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
      audioRef.current.muted = newMutedState;
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

  const handleManualAudioStart = async () => {
    const element = audioRef.current;
    if (!element) return;

    try {
      // If audio is already playing muted, just unmute it
      if (isAudioPlaying && isAudioMuted) {
        // Fade in volume for smooth transition
        let currentVol = 0;
        element.volume = 0;
        element.muted = false;
        setIsAudioMuted(false);
        
        const fadeIn = setInterval(() => {
          currentVol += 0.05;
          if (currentVol >= 0.5) {
            element.volume = 0.5;
            clearInterval(fadeIn);
          } else {
            element.volume = Math.max(0, Math.min(1, currentVol));
          }
        }, 50);
      } else {
        // Start playing with unmuted audio
        element.muted = false;
        element.volume = 0.5;
        setIsAudioMuted(false);
        await element.play();
        setIsAudioPlaying(true);
      }
      setAudioInteractionRequired(false);
    } catch (error) {
      console.debug('Manual audio start failed:', error);
    }
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
  const hasRecentPurchases = recentPurchases.length > 0;
  const recentPurchasesToDisplay = recentPurchases.slice(0, 2);
  const hasUrgencyContent = (showStockDropAlert && currentStockForSelectedSize > 0) || hasRecentPurchases;
  const shouldShowMobileUrgency = !hideUrgencyBanner && hasUrgencyContent;
  const showUrgencyLauncher = hideUrgencyBanner && hasUrgencyContent;
  const totalBaselineStock = originalStock > 0 ? originalStock : currentStockForSelectedSize;
  const stockPercentage = totalBaselineStock > 0 ? Math.round((currentStockForSelectedSize / totalBaselineStock) * 100) : 0;
  const stockProgressWidth = Math.min(100, Math.max(0, stockPercentage));
  const stockSeverityClass = currentStockForSelectedSize <= 2 ? 'bg-red-500' : currentStockForSelectedSize <= 5 ? 'bg-orange-400' : 'bg-amber-300';
  const UrgencyIcon = (showStockDropAlert && currentStockForSelectedSize > 0) ? AlertTriangle : BellRing;
  const handleDismissUrgency = () => {
    setHideUrgencyBanner(true);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      {shouldShowMobileUrgency && (
        <div className="sticky inset-x-0 top-0 z-30 px-4 pt-4 md:hidden">
          <div className="relative overflow-hidden border shadow-xl rounded-3xl border-white/60 bg-white/95 shadow-black/10 backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-amber-300" />
            <div className="flex items-start gap-3 px-4 pt-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${showStockDropAlert && currentStockForSelectedSize > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                <UrgencyIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex-1 pb-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live stock alerts</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {showStockDropAlert && currentStockForSelectedSize > 0
                        ? `Only ${Math.max(1, currentStockForSelectedSize)} pieces left in your selected size`
                        : 'Shoppers are buying right now'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {showStockDropAlert && currentStockForSelectedSize > 0
                        ? 'Sizes move fast—checkout now to reserve yours.'
                        : 'Fresh orders are rolling in from the community.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissUrgency}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Dismiss live alerts"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {showStockDropAlert && currentStockForSelectedSize > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold tracking-wide uppercase text-slate-400">
                      <span>Size availability</span>
                      <span className="text-slate-500">{Math.max(1, currentStockForSelectedSize)} left</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-slate-200">
                      <span
                        className={`absolute inset-y-0 left-0 rounded-full ${stockSeverityClass}`}
                        style={{ width: `${stockProgressWidth}%` }}
                      />
                    </div>
                  </div>
                )}

                {hasRecentPurchases && (
                  <div className="px-3 py-3 space-y-2 text-white shadow-inner rounded-2xl bg-slate-950/95 shadow-black/30">
                    <p className="text-xs font-semibold tracking-wide uppercase text-slate-300">Live shopper feed</p>
                    <ul className="space-y-1.5 text-sm">
                      {recentPurchasesToDisplay.map((purchase, index) => (
                        <li key={`${purchase}-${index}`} className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 text-amber-300" aria-hidden="true" />
                          <span className="leading-snug">{purchase}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showUrgencyLauncher && (
        <button
          type="button"
          onClick={() => setHideUrgencyBanner(false)}
          className="fixed z-30 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition -translate-x-1/2 rounded-full shadow-xl bottom-6 left-1/2 bg-slate-950 shadow-black/30 hover:-translate-y-1 md:hidden"
        >
          <BellRing className="w-4 h-4" aria-hidden="true" />
          Live shopper alerts
        </button>
      )}
      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-100 bg-gray-50/50">
        <div className="container px-4 py-3 sm:py-4 mx-auto sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 overflow-x-auto" aria-label="Breadcrumb">
            <Link href="/" className="flex-shrink-0 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
              Home
            </Link>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-[-90deg] flex-shrink-0 text-gray-400" aria-hidden="true" />
            <Link href="/shop" className="flex-shrink-0 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
              Shop
            </Link>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-[-90deg] flex-shrink-0 text-gray-400" aria-hidden="true" />
            <span className="font-medium text-gray-900 truncate" aria-current="page">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container px-4 py-4 sm:py-8 mx-auto sm:px-6 lg:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          
          {/* Image Gallery */}
          <div ref={imageRef} className="space-y-3 sm:space-y-4">
            {/* Main Media */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="relative w-full overflow-hidden bg-gray-100 rounded-2xl sm:rounded-3xl aspect-square shadow-sm cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                aria-label="Click to zoom image"
              >
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
                        fetchPriority="high"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 50vw"
                        className={`object-cover transition-all duration-500 group-hover:scale-105 ${loadedMediaId === selectedMedia.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                        onLoad={() => setLoadedMediaId(selectedMedia.id)}
                        placeholder="empty"
                      />
                    )}
                    
                    {/* Hover overlay with zoom hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                          <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-2xl animate-pulse" />
                )}

                {/* Sale Badge */}
                {isOnSale && (
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold text-white bg-red-500 rounded-full shadow-lg shadow-red-500/30">
                      SALE
                    </span>
                  </div>
                )}
              </button>
              
              {/* Video mute button - outside the zoom button */}
              {isSelectedMediaVideo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideoMute();
                  }}
                  className="absolute flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-white transition-all rounded-full bg-black/70 backdrop-blur-sm bottom-3 left-3 sm:bottom-4 sm:left-4 hover:bg-black/90 active:scale-95 z-10"
                >
                  {isVideoMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  {isVideoMuted ? 'Tap for Sound' : 'Sound On'}
                </button>
              )}
            </div>

            {/* Thumbnail Grid - Improved for Mobile Touch */}
            {selectedVariant.images && selectedVariant.images.length > 1 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-4 sm:overflow-x-visible scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
                      className={`relative flex-shrink-0 w-20 h-20 sm:w-auto sm:h-auto overflow-hidden bg-gray-50 rounded-xl aspect-square ring-2 ring-offset-2 transition-all duration-200 ${
                        selectedMedia?.id === media.id 
                          ? 'ring-gray-900 shadow-lg' 
                          : 'ring-transparent hover:ring-gray-300 active:scale-95'
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
                        <span className="absolute inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white uppercase tracking-wide bg-black/80 rounded-md bottom-1 left-1 backdrop-blur-sm">
                          <Video className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Video
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Product Details */}
          <div ref={detailsRef} className="flex flex-col justify-center space-y-5 sm:space-y-6 lg:space-y-8">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl xl:text-5xl leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Audio Player Controls - Compact Mobile Design */}
            {product.audio_url && (
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`relative flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full ${isAudioPlaying ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {isAudioPlaying ? (
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    ) : (
                      <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                    {isAudioPlaying ? (isAudioMuted ? 'Muted' : 'Playing') : 'Audio Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(audioInteractionRequired || isAudioMuted) && isAudioPlaying && (
                    <button
                      type="button"
                      onClick={handleManualAudioStart}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md"
                    >
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                      <span className="hidden xs:inline">Enable</span> Sound
                    </button>
                  )}
                  <button
                    onClick={toggleProductAudioMute}
                    className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-gray-600 transition-all bg-white border border-gray-200 rounded-full shadow-sm hover:border-gray-300 hover:text-gray-900 hover:shadow-md active:scale-95"
                    title={isAudioMuted ? "Unmute audio" : "Mute audio"}
                  >
                    {isAudioMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
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
            
            {/* Price - Improved Mobile Layout */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  LKR {price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {isOnSale && compareAtPrice && (
                  <span className="text-lg sm:text-xl lg:text-2xl text-gray-400 line-through">
                    LKR {compareAtPrice.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              {isOnSale && compareAtPrice && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full">
                  <span className="text-green-500">✓</span>
                  Save LKR {(compareAtPrice - price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
            
            {/* Color Selection - Better Touch Targets */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-medium text-gray-900">
                Color: <span className="font-semibold">{selectedVariant.colorName}</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {product.variants.map((variant) => (
                  <button
                    key={variant.variantId}
                    onClick={() => handleVariantSelect(variant)}
                    className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all duration-200 ${
                      selectedVariant.variantId === variant.variantId
                        ? 'ring-2 ring-gray-900 ring-offset-2 scale-110'
                        : 'ring-1 ring-gray-300 hover:ring-gray-400 hover:scale-105 active:scale-95'
                    }`}
                    style={{ backgroundColor: variant.colorHex }}
                    title={variant.colorName}
                    aria-label={`Select ${variant.colorName} color`}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection - Improved Touch Targets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-medium text-gray-900">Select Size</h3>
                <Link 
                  href="/size-guide" 
                  className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span className="underline underline-offset-2">Size Guide</span>
                  <ChevronDown className="w-3 h-3 -rotate-90" />
                </Link>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 sm:gap-3">
                {selectedVariant.stock.map((stockItem) => (
                  <button
                    key={stockItem.id}
                    onClick={() => setSelectedSize(stockItem)}
                    disabled={stockItem.stock <= 0}
                    className={`relative py-3 sm:py-3.5 text-sm font-medium rounded-xl border-2 transition-all duration-200 ${
                      stockItem.stock <= 0
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : selectedSize?.id === stockItem.id
                          ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20'
                          : 'bg-white text-gray-900 border-gray-200 hover:border-gray-900 hover:shadow-md active:scale-95'
                    }`}
                  >
                    {stockItem.size}
                    {stockItem.stock <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-gray-300 rotate-45 scale-75" />
                      </div>
                    )}
                    {stockItem.stock > 0 && stockItem.stock <= 3 && selectedSize?.id !== stockItem.id && (
                      <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" title="Low stock" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Quantity & Add to Cart */}
            <div className="space-y-3 sm:space-y-4">
              {/* Stock Drop Alert */}
              {showStockDropAlert && (
                <div className="flex items-center gap-2.5 p-3 text-sm font-medium text-red-700 border border-red-200 rounded-xl bg-red-50">
                  <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm">⚡ Someone just purchased this item!</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 sm:p-4 text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm">{error}</span>
                    <button
                      onClick={clearError}
                      className="flex-shrink-0 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Quantity and Add to Cart - Mobile Optimized */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {/* Quantity Selector */}
                <div className="flex items-center justify-between sm:justify-start border-2 border-gray-200 rounded-xl bg-white overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3.5 sm:p-3 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 sm:w-4 sm:h-4" />
                  </button>
                  <span className="px-6 sm:px-4 py-3 font-semibold text-base sm:text-sm min-w-[60px] text-center tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStockForSelectedSize, quantity + 1))}
                    disabled={quantity >= currentStockForSelectedSize}
                    className="p-3.5 sm:p-3 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 sm:w-4 sm:h-4" />
                  </button>
                </div>
                
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize || isSoldOut || isAdding}
                  className="flex-1 flex items-center justify-center gap-2 px-6 sm:px-8 py-4 font-semibold text-white text-base sm:text-lg transition-all bg-gray-900 rounded-xl add-to-cart-btn hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/25 active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isAdding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSoldOut ? (
                    'Sold Out'
                  ) : (
                    <>
                      <span>Add to Cart</span>
                      {quantity > 1 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
                          {quantity}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
              
              {/* Stock Warning - Improved Design */}
              {selectedSize && currentStockForSelectedSize > 0 && currentStockForSelectedSize <= 10 && (
                <div className="space-y-2 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200">
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      currentStockForSelectedSize <= 3 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                    }`} />
                    <p className={`text-xs sm:text-sm font-semibold ${
                      currentStockForSelectedSize <= 3 
                        ? 'text-red-700' 
                        : 'text-orange-700'
                    }`}>
                      {currentStockForSelectedSize <= 3 
                        ? `Only ${currentStockForSelectedSize} left - Almost gone!` 
                        : `Only ${currentStockForSelectedSize} left in stock`
                      }
                    </p>
                  </div>
                  
                  {/* Stock Progress Bar */}
                  <div className="relative h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                        currentStockForSelectedSize <= 3 ? 'bg-red-500' : 'bg-orange-400'
                      }`}
                      style={{ width: `${Math.min(100, (currentStockForSelectedSize / 10) * 100)}%` }}
                    />
                  </div>
                  
                  {/* Recent Purchase Notifications */}
                  {recentPurchases.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-orange-200/50 space-y-1.5">
                      {recentPurchases.slice(0, 2).map((purchase, index) => (
                        <p key={index} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="flex-shrink-0 mt-0.5">🛒</span>
                          <span className="leading-relaxed">{purchase}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trust Indicators - Better Mobile Layout */}
            <div className="flex flex-wrap gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-100">
              <div className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-full">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Secure Payments</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-full">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Fast Delivery</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-full">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Easy Returns</span>
              </div>
            </div>

            {/* Product Information Accordion - Mobile Optimized */}
            <Accordion.Root type="single" collapsible className="space-y-2">
              <Accordion.Item value="description" className="overflow-hidden border border-gray-200 rounded-xl">
                <Accordion.Header>
                  <Accordion.Trigger className="flex items-center justify-between w-full p-4 font-medium text-left text-sm sm:text-base transition-colors hover:bg-gray-50 group">
                    Product Details
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden transition-all animate-slideDown data-[state=closed]:animate-slideUp">
                  <div className="px-4 pb-4 text-xs sm:text-sm leading-relaxed text-gray-600">
                    <div
                      className="space-y-3 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-gray-600"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description || 'No description available.') }}
                    />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="shipping" className="overflow-hidden border border-gray-200 rounded-xl">
                <Accordion.Header>
                  <Accordion.Trigger className="flex items-center justify-between w-full p-4 font-medium text-left text-sm sm:text-base transition-colors hover:bg-gray-50 group">
                    Shipping & Returns
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden transition-all animate-slideDown data-[state=closed]:animate-slideUp">
                  <div className="px-4 pb-4">
                    <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600">
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>Free standard shipping on orders over LKR 10,000</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>30-day return policy for unworn items</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>Express shipping available at checkout</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>Items shipped within 1-2 business days</span>
                      </li>
                    </ul>
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="care" className="overflow-hidden border border-gray-200 rounded-xl">
                <Accordion.Header>
                  <Accordion.Trigger className="flex items-center justify-between w-full p-4 font-medium text-left text-sm sm:text-base transition-colors hover:bg-gray-50 group">
                    Care Instructions
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden transition-all animate-slideDown data-[state=closed]:animate-slideUp">
                  <div className="px-4 pb-4">
                    <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600">
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        <span>Machine wash cold with similar colors</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        <span>Do not bleach or use fabric softener</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        <span>Tumble dry low or hang to dry</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
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

      {/* Lightbox/Zoom Modal */}
      {isLightboxOpen && selectedMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom view"
        >
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fadeIn"
            onClick={() => setIsLightboxOpen(false)}
          />
          
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close zoom view"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Navigation arrows for multiple images */}
          {selectedVariant && selectedVariant.images && selectedVariant.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = selectedVariant.images.findIndex(m => m.id === selectedMedia.id);
                  const prevIndex = currentIndex <= 0 ? selectedVariant.images.length - 1 : currentIndex - 1;
                  setSelectedMedia(selectedVariant.images[prevIndex]);
                  setLoadedMediaId(null);
                }}
                className="absolute left-4 z-10 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Previous image"
              >
                <ChevronDown className="w-6 h-6 rotate-90" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = selectedVariant.images.findIndex(m => m.id === selectedMedia.id);
                  const nextIndex = currentIndex >= selectedVariant.images.length - 1 ? 0 : currentIndex + 1;
                  setSelectedMedia(selectedVariant.images[nextIndex]);
                  setLoadedMediaId(null);
                }}
                className="absolute right-4 z-10 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Next image"
              >
                <ChevronDown className="w-6 h-6 -rotate-90" />
              </button>
            </>
          )}
          
          {/* Zoom controls */}
          {!isVideoUrl(selectedMedia.url) && (
            <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                disabled={zoomLevel <= 1}
                className="p-2.5 text-white hover:bg-white/20 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Zoom out"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                className="px-3 py-1.5 text-white text-sm font-medium hover:bg-white/20 rounded-full transition-all min-w-[60px]"
                aria-label="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                disabled={zoomLevel >= 4}
                className="p-2.5 text-white hover:bg-white/20 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Zoom in"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Zoomed content */}
          <div 
            ref={imageContainerRef}
            className={`relative w-full max-w-5xl mx-4 sm:mx-8 aspect-square sm:aspect-[4/3] animate-zoomIn overflow-hidden rounded-2xl ${zoomLevel > 1 ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isVideoUrl(selectedMedia.url) ? (
              <video
                ref={lightboxVideoRef}
                src={selectedMedia.url}
                className="w-full h-full object-contain"
                autoPlay
                loop
                controls
                playsInline
              />
            ) : (
              <div
                className="relative w-full h-full transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                }}
              >
                <Image
                  src={selectedMedia.url}
                  alt={`${product?.name || 'Product'} - Zoomed view`}
                  fill
                  className="object-contain select-none"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  priority
                  draggable={false}
                />
              </div>
            )}
            
            {/* Zoom hint */}
            {zoomLevel === 1 && !isVideoUrl(selectedMedia.url) && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white/80 text-xs font-medium pointer-events-none">
                Use scroll wheel or buttons to zoom
              </div>
            )}
            
            {/* Pan hint when zoomed */}
            {zoomLevel > 1 && !isDragging && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white/80 text-xs font-medium pointer-events-none animate-pulse">
                Drag to pan
              </div>
            )}
          </div>
          
          {/* Thumbnail strip at bottom */}
          {selectedVariant && selectedVariant.images && selectedVariant.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 backdrop-blur-sm rounded-xl">
              {selectedVariant.images.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(media);
                    setLoadedMediaId(null);
                  }}
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden transition-all duration-200 ${
                    selectedMedia.id === media.id 
                      ? 'ring-2 ring-white scale-110' 
                      : 'ring-1 ring-white/30 hover:ring-white/60 opacity-70 hover:opacity-100'
                  }`}
                >
                  {isVideoUrl(media.url) ? (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <Image
                      src={media.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Image counter */}
          {selectedVariant && selectedVariant.images && selectedVariant.images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
              {selectedVariant.images.findIndex(m => m.id === selectedMedia.id) + 1} / {selectedVariant.images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}