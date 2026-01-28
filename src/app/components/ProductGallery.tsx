"use client";

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
}

export default function ProductGallery({ media, productName }: ProductGalleryProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const openFullscreen = (index: number) => {
    // Only open fullscreen on mobile devices (screen width < 768px)
    if (window.innerWidth < 768) {
      console.log('Opening fullscreen for index:', index);
      setFullscreenIndex(index);
    }
  };

  const closeFullscreen = () => {
    setFullscreenIndex(null);
  };

  const goToPrevious = () => {
    if (fullscreenIndex !== null && fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    }
  };

  const goToNext = () => {
    if (fullscreenIndex !== null && fullscreenIndex < media.length - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    }
  };

  const renderLayout = () => {
    const sections = [];
    let i = 0;

    while (i < media.length) {
      const current = media[i];
      const next = media[i + 1];

      // RULE 1: THE VERY FIRST ITEM (Index 0)
      // Always Full Screen (100vw) whether it is an image or video
      if (i === 0) {
        const currentIndex = i;
        sections.push(
          <div 
            key="hero" 
            className="w-screen h-[100svh] bg-gray-100 overflow-hidden cursor-pointer" 
            onClick={() => openFullscreen(currentIndex)}
            onTouchEnd={(e) => {
              e.preventDefault();
              openFullscreen(currentIndex);
            }}
          >
            {current.type === 'video' ? (
              <video
                src={current.url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover scale-110"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Dynamic external URLs from server
              <img
                src={current.url}
                alt={productName}
                className="w-full h-full object-cover scale-110"
              />
            )}
          </div>
        );
        i++;
        continue; // Move to next iteration
      }

      // RULE 2: VIDEO (Anywhere else)
      // Always Full Screen
      if (current.type === 'video') {
        const currentIndex = i;
        sections.push(
          <div 
            key={`vid-${i}`} 
            className="w-screen h-[100svh] bg-black overflow-hidden cursor-pointer" 
            onClick={() => openFullscreen(currentIndex)}
            onTouchEnd={(e) => {
              e.preventDefault();
              openFullscreen(currentIndex);
            }}
          >
            <video
              src={current.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover scale-110"
            />
          </div>
        );
        i++;
      } 
      
      // RULE 3: TWO IMAGES SIDE-BY-SIDE
      // Only if both are images and it's not the first item
      else if (current.type === 'image' && next && next.type === 'image') {
        const currentIndex = i;
        const nextIndex = i + 1;
        sections.push(
          <div key={`pair-${i}`} className="flex w-screen flex-row">
            <div 
              className="flex-1 h-[90svh] md:h-screen overflow-hidden cursor-pointer" 
              onClick={() => openFullscreen(currentIndex)}
              onTouchEnd={(e) => {
                e.preventDefault();
                openFullscreen(currentIndex);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic external URLs from server */}
              <img
                src={current.url}
                alt={productName}
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <div 
              className="flex-1 h-[90svh] md:h-screen overflow-hidden cursor-pointer" 
              onClick={() => openFullscreen(nextIndex)}
              onTouchEnd={(e) => {
                e.preventDefault();
                openFullscreen(nextIndex);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic external URLs from server */}
              <img
                src={next.url}
                alt={productName}
                className="w-full h-full object-cover scale-110"
              />
            </div>
          </div>
        );
        i += 2; // Jump over the paired image
      } 

      // RULE 4: SINGLE IMAGE ALONE (Centered)
      else {
        const currentIndex = i;
        sections.push(
          <div key={`single-${i}`} className="w-screen flex items-center justify-center bg-white py-1 px-1 md:py-20 md:px-6 min-h-[90svh] md:min-h-0">
            <div 
              className="max-w-5xl w-full h-full flex items-center overflow-hidden cursor-pointer" 
              onClick={() => openFullscreen(currentIndex)}
              onTouchEnd={(e) => {
                e.preventDefault();
                openFullscreen(currentIndex);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic external URLs from server */}
              <img
                src={current.url}
                alt={productName}
                className="w-full h-auto object-contain max-h-[89svh] md:max-h-none scale-110"
              />
            </div>
          </div>
        );
        i++;
      }
    }
    return sections;
  };

  return (
    <>
      <div className="flex flex-col w-full overflow-x-hidden bg-white">{renderLayout()}</div>
      
      {/* Fullscreen Modal */}
      {fullscreenIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Previous Button */}
          {fullscreenIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Next Button */}
          {fullscreenIndex < media.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Media Display */}
          <div className="w-full h-full flex items-center justify-center p-4">
            {media[fullscreenIndex].type === 'video' ? (
              <video
                src={media[fullscreenIndex].url}
                autoPlay
                muted
                loop
                playsInline
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Dynamic external URLs from server
              <img
                src={media[fullscreenIndex].url}
                alt={productName}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-white text-sm font-medium">
              {fullscreenIndex + 1} / {media.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}