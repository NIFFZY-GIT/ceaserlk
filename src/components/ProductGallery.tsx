"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { gsap } from 'gsap';

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(url);

interface MediaItem {
  id: string;
  url: string;
}

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
  breadcrumb?: {
    label: string;
    href: string;
  };
  showBreadcrumb?: boolean;
  showMuteControl?: boolean;
  className?: string;
  height?: string;
  onViewChange?: (viewIndex: number) => void;
}

export default function ProductGallery({
  media,
  productName,
  breadcrumb = { label: 'Collection', href: '/shop' },
  showBreadcrumb = true,
  showMuteControl = true,
  className = '',
  height = '100svh',
  onViewChange,
}: ProductGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  // Detect aspect ratios for all images
  useEffect(() => {
    if (!media?.length) return;
    const detectAspectRatios = async () => {
      const ratios: Record<string, number> = {};
      await Promise.all(media.map((img) => {
        if (isVideoUrl(img.url)) {
          ratios[img.id] = 16/9;
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          const i = new window.Image();
          i.src = img.url;
          i.onload = () => {
            ratios[img.id] = i.naturalWidth / i.naturalHeight;
            resolve(null);
          };
          i.onerror = () => {
            ratios[img.id] = 1;
            resolve(null);
          };
        });
      }));
      setAspectRatios(ratios);
    };
    detectAspectRatios();
  }, [media]);

  // Sort media: videos first, then images
  const mediaItems = useMemo(() => {
    if (!media?.length) return [];
    return [...media].sort((a) => (isVideoUrl(a.url) ? -1 : 1));
  }, [media]);

  // Check if image is square-ish (aspect ratio between 0.8 and 1.2)
  const isSquare = useCallback((id: string) => {
    const ratio = aspectRatios[id];
    return ratio && ratio > 0.8 && ratio < 1.2;
  }, [aspectRatios]);

  // Find first image index (after videos)
  const firstImageIdx = useMemo(() => {
    return mediaItems.findIndex(item => !isVideoUrl(item.url));
  }, [mediaItems]);

  // Check if first image is square (needs centering for hero view)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _firstImageIsSquare = useMemo(() => {
    if (firstImageIdx === -1) return false;
    return isSquare(mediaItems[firstImageIdx].id);
  }, [firstImageIdx, mediaItems, isSquare]);

  // Calculate width for each media item in the track
  // Videos = 100vw, All square images = 50vw, Non-squares = 100vw
  const itemWidths = useMemo(() => {
    return mediaItems.map((item) => {
      if (isVideoUrl(item.url)) return 100;
      if (!isSquare(item.id)) return 100;
      return 50; // All square images are 50vw
    });
  }, [mediaItems, isSquare]);

  // Calculate cumulative positions (NO spacers - simple continuous track)
  const itemPositions = useMemo(() => {
    let pos = 0;
    return itemWidths.map((width) => {
      const currentPos = pos;
      pos += width;
      return currentPos;
    });
  }, [itemWidths]);

  // Define "views" - what we see at each navigation step
  // Video -> Image1 alone (centered) -> Image1+Image2 -> Image2+Image3 -> etc.
  const views = useMemo(() => {
    const result: Array<{
      offset: number;
      mediaIndices: number[];
      type: 'video' | 'hero' | 'pair' | 'single';
    }> = [];

    const videoIndices: number[] = [];
    const imageIndices: number[] = [];
    
    mediaItems.forEach((item, idx) => {
      if (isVideoUrl(item.url)) {
        videoIndices.push(idx);
      } else {
        imageIndices.push(idx);
      }
    });

    // Add videos as separate views (full screen)
    videoIndices.forEach(idx => {
      result.push({
        offset: itemPositions[idx],
        mediaIndices: [idx],
        type: 'video'
      });
    });

    // Process images
    if (imageIndices.length > 0) {
      const firstImgIdx = imageIndices[0];
      const firstImgIsSquare = isSquare(mediaItems[firstImgIdx].id);
      
      // View: First image alone (hero) - CENTERED on screen if square
      if (firstImgIsSquare) {
        // Image is 50vw, to center it: offset = imagePosition - 25vw
        result.push({
          offset: itemPositions[firstImgIdx] - 25,
          mediaIndices: [firstImgIdx],
          type: 'hero'
        });
      } else {
        // Non-square first image: show full width
        result.push({
          offset: itemPositions[firstImgIdx],
          mediaIndices: [firstImgIdx],
          type: 'single'
        });
      }

      // View 2+: Sliding pairs - Image1+Image2, Image2+Image3, etc.
      // NO gap - images are flush at their natural positions
      for (let i = 0; i < imageIndices.length - 1; i++) {
        const currentIdx = imageIndices[i];
        const nextIdx = imageIndices[i + 1];
        
        if (isSquare(mediaItems[currentIdx].id) && isSquare(mediaItems[nextIdx].id)) {
          result.push({
            offset: itemPositions[currentIdx],
            mediaIndices: [currentIdx, nextIdx],
            type: 'pair'
          });
        } else if (!isSquare(mediaItems[nextIdx].id)) {
          result.push({
            offset: itemPositions[nextIdx],
            mediaIndices: [nextIdx],
            type: 'single'
          });
        }
      }
    }

    return result;
  }, [mediaItems, itemPositions, isSquare]);

  // Current view index
  const currentViewIndex = useMemo(() => {
    for (let i = views.length - 1; i >= 0; i--) {
      if (views[i].mediaIndices.includes(currentIndex)) {
        return i;
      }
    }
    return 0;
  }, [views, currentIndex]);

  const navigateToView = useCallback((viewIndex: number) => {
    if (isAnimating || !trackRef.current || viewIndex < 0 || viewIndex >= views.length) return;
    
    setIsAnimating(true);
    setCurrentIndex(views[viewIndex].mediaIndices[0]);
    onViewChange?.(viewIndex);
    
    gsap.to(trackRef.current, {
      x: `-${views[viewIndex].offset}vw`,
      duration: 0.9,
      ease: "power3.inOut",
      onComplete: () => setIsAnimating(false)
    });
  }, [isAnimating, views, onViewChange]);

  // Reset position when media or aspect ratios change - start at first view
  useEffect(() => {
    if (trackRef.current && views.length > 0 && Object.keys(aspectRatios).length > 0) {
      // Set initial position to first view
      gsap.set(trackRef.current, { x: `-${views[0].offset}vw` });
      setCurrentIndex(views[0].mediaIndices[0]);
    }
  }, [media, views, aspectRatios]);

  const hasVideos = mediaItems.some(item => isVideoUrl(item.url));
  
  // Wait for aspect ratios to load before rendering
  const isLoading = Object.keys(aspectRatios).length === 0 && mediaItems.some(item => !isVideoUrl(item.url));

  if (!mediaItems.length || isLoading) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-white ${className}`} style={{ height }}>
      {/* THE TRACK: Continuous strip of media - NO spacers, just flush images */}
      <div 
        ref={trackRef}
        className="flex h-full will-change-transform"
        style={{ width: 'fit-content' }}
      >
        {mediaItems.map((item, idx) => {
          const width = itemWidths[idx];
          
          return (
            <div 
              key={item.id} 
              className="relative h-full flex-shrink-0"
              style={{ width: `${width}vw` }}
            >
              {isVideoUrl(item.url) ? (
                <video 
                  src={item.url} 
                  className="h-full w-full object-cover" 
                  autoPlay 
                  loop 
                  muted={isVideoMuted} 
                  playsInline 
                />
              ) : (
                <Image 
                  src={item.url} 
                  alt={productName} 
                  fill 
                  className="object-cover"
                  priority={idx <= 2}
                  sizes={`${width}vw`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* CONTROLS */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
        {/* Top: Breadcrumb */}
        {showBreadcrumb && (
          <div className="flex justify-center pointer-events-auto">
            <nav className="flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5 shadow-sm">
              <Link href={breadcrumb.href} className="opacity-40 hover:opacity-100 transition-opacity">
                {breadcrumb.label}
              </Link>
              <span className="opacity-20">/</span>
              <span>{productName}</span>
            </nav>
          </div>
        )}

        {/* Middle: Navigation Arrows */}
        <div className="flex justify-between items-center px-4 pointer-events-none">
          <button 
            onClick={() => navigateToView(currentViewIndex - 1)}
            className={`p-4 bg-white/20 hover:bg-white/90 backdrop-blur-md rounded-full pointer-events-auto transition-all ${currentViewIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Mute control for videos */}
          {showMuteControl && hasVideos && (
            <button
              onClick={() => setIsVideoMuted(!isVideoMuted)}
              className="p-3 bg-white/20 hover:bg-white/90 backdrop-blur-md rounded-full pointer-events-auto transition-all"
              aria-label={isVideoMuted ? "Unmute" : "Mute"}
            >
              {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          
          <button 
            onClick={() => navigateToView(currentViewIndex + 1)}
            className={`p-4 bg-white/20 hover:bg-white/90 backdrop-blur-md rounded-full pointer-events-auto transition-all ${currentViewIndex === views.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom: Thumbnail Navigation */}
        <div className="flex flex-col items-center gap-8 pointer-events-auto">
          <div className="flex gap-2 p-1.5 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl">
            {views.map((view, idx) => {
              const isActive = currentViewIndex === idx;
              const isPair = view.type === 'pair';
              const isVideo = view.type === 'video';
              
              return (
                <button
                  key={idx}
                  onClick={() => navigateToView(idx)}
                  className={`relative rounded-lg overflow-hidden transition-all duration-500 ${isActive ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-50 hover:opacity-80'}`}
                  style={{ 
                    width: isPair ? '80px' : '48px', 
                    height: '48px' 
                  }}
                >
                  {isVideo ? (
                    <video 
                      src={mediaItems[view.mediaIndices[0]].url} 
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : isPair ? (
                    <div className="flex h-full">
                      <div className="relative w-1/2 h-full">
                        <Image src={mediaItems[view.mediaIndices[0]].url} alt="nav" fill className="object-cover" sizes="40px" />
                      </div>
                      <div className="relative w-1/2 h-full">
                        <Image src={mediaItems[view.mediaIndices[1]].url} alt="nav" fill className="object-cover" sizes="40px" />
                      </div>
                    </div>
                  ) : (
                    <Image src={mediaItems[view.mediaIndices[0]].url} alt="nav" fill className="object-cover" sizes="48px" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
