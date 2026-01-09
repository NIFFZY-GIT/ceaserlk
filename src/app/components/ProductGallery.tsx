"use client";

import React from 'react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
}

export default function ProductGallery({ media, productName }: ProductGalleryProps) {
  const renderLayout = () => {
    const sections = [];
    let i = 0;

    while (i < media.length) {
      const current = media[i];
      const next = media[i + 1];

      // RULE 1: THE VERY FIRST ITEM (Index 0)
      // Always Full Screen (100vw) whether it is an image or video
      if (i === 0) {
        sections.push(
          <div key="hero" className="w-screen h-[100svh] bg-gray-100 overflow-hidden">
            {current.type === 'video' ? (
              <video
                src={current.url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={current.url}
                alt={productName}
                className="w-full h-full object-cover"
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
        sections.push(
          <div key={`vid-${i}`} className="w-screen h-[100svh] bg-black">
            <video
              src={current.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        );
        i++;
      } 
      
      // RULE 3: TWO IMAGES SIDE-BY-SIDE
      // Only if both are images and it's not the first item
      else if (current.type === 'image' && next && next.type === 'image') {
        sections.push(
          <div key={`pair-${i}`} className="flex w-screen flex-row">
            <div className="flex-1 aspect-[3/4] md:h-screen">
              <img
                src={current.url}
                alt={productName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 aspect-[3/4] md:h-screen">
              <img
                src={next.url}
                alt={productName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        );
        i += 2; // Jump over the paired image
      } 

      // RULE 4: SINGLE IMAGE ALONE (Centered)
      else {
        sections.push(
          <div key={`single-${i}`} className="w-screen flex items-center justify-center bg-white py-20 px-6">
            <div className="max-w-5xl w-full">
              <img
                src={current.url}
                alt={productName}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        );
        i++;
      }
    }
    return sections;
  };

  return <div className="flex flex-col w-full overflow-x-hidden bg-white">{renderLayout()}</div>;
}