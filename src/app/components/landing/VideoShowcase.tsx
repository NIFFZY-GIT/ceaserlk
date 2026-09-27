// src/app/components/landing/VideoShowcase.tsx

"use client";

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SLIDE_DURATION_MS = 5000;

type ShowcaseSlide = {
  id: number | string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
};

const fallbackShowcaseData: ShowcaseSlide[] = [
  {
    id: 'default-1',
    title: "To rule an empire, you must dress like an emperor",
    description:
      "Crafted for those who demand excellence.\nEvery detail reflects power, precision, and purpose.",
    ctaText: "Discover The Tech",
    ctaHref: "/about",
    mediaType: 'image',
    mediaUrl: '/images/H123.JPG',
  },
  {
    id: 'default-2',
    title: "WEAR THE MINDSET OF SUCCESS",
    description:
      "CEASAR is more than clothing —\nit’s a statement of discipline, focus, and elevation.",
    ctaText: "Our Mission",
    ctaHref: "/about",
    mediaType: 'image',
    mediaUrl: '/images/H123.JPG',
  },
  {
    id: 'default-3',
    title: "DESIGNED FOR THOSE WHO RISE",
    description:
      "Luxury fabrics. Timeless design.\nBuilt for individuals who never settle.",
    ctaText: "Explore The Collection",
    ctaHref: "/shop",
    mediaType: 'image',
    mediaUrl: '/images/H123.JPG',
  }
];

const VideoShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showcaseData, setShowcaseData] = useState(fallbackShowcaseData);
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressAnimation = useRef<gsap.core.Tween | null>(null);
  const activeSlide = showcaseData[activeIndex] ?? fallbackShowcaseData[0];

  // Animation for the entire section entering the viewport
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current, {
        opacity: 0,
        y: 100,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSlides = async () => {
      try {
        const response = await fetch('/api/hero-slides', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { slides?: ShowcaseSlide[] };
        if (!cancelled && Array.isArray(data.slides) && data.slides.length > 0) {
          setShowcaseData(data.slides);
          setActiveIndex(0);
        }
      } catch (error) {
        console.error('Failed to load homepage hero slides:', error);
      }
    };

    void loadSlides();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeSlide.mediaType !== 'video') return;
    void video.play().catch(() => undefined);
    return () => video.pause();
  }, [activeSlide.mediaType, activeSlide.mediaUrl]);

  // Effect to handle the auto-playing slideshow and text animations
  useEffect(() => {
    // Animate the text content for the current slide
    const contentTl = gsap.timeline();
    contentTl.fromTo(".slide-title", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
             .fromTo(".slide-description", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, "-=0.4")
             .fromTo(".slide-cta", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, "-=0.4");
    
    // Animate the progress bar
    progressAnimation.current?.kill(); // Kill any existing animation
    progressAnimation.current = gsap.fromTo(`.progress-bar-${activeIndex}`,
      { scaleX: 0 }, 
      { scaleX: 1, duration: SLIDE_DURATION_MS / 1000, ease: 'linear' }
    );
    
    const interval = setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % showcaseData.length);
    }, SLIDE_DURATION_MS);

    return () => {
      contentTl.kill();
      progressAnimation.current?.kill();
      clearInterval(interval);
    };
  }, [activeIndex, showcaseData.length]);

  const handleSlideChange = (index: number) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
  };

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[820px] w-full bg-brand-black text-white flex items-center"
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        {activeSlide.mediaType === 'video' ? (
          <video
            key={activeSlide.mediaUrl}
            ref={videoRef}
            src={activeSlide.mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={activeSlide.title}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={activeSlide.mediaUrl}
            src={activeSlide.mediaUrl}
            alt={activeSlide.title}
            className="h-full w-full object-cover object-[center_30%]"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/55 z-10" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 h-full flex flex-col justify-end pt-16 lg:pt-24 pb-24 lg:pb-32 gap-10">
        <div className="max-w-3xl lg:max-w-5xl space-y-8 lg:space-y-10">
          <h2 className="slide-title break-words whitespace-pre-line text-4xl font-bold uppercase leading-[0.9] sm:text-5xl md:text-7xl lg:text-8xl">
            {activeSlide.title}
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-100 leading-relaxed whitespace-pre-line max-w-3xl slide-description">
            {activeSlide.description}
          </p>
          {activeSlide.ctaText && (
            <Link
              href={activeSlide.ctaHref}
              className="slide-cta group inline-flex items-center gap-3 pt-3 text-lg font-bold text-white lg:text-xl"
            >
              <span>{activeSlide.ctaText}</span>
              <ArrowRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-2" />
            </Link>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 lg:left-6 lg:translate-x-0 lg:bottom-28 flex items-center gap-4">
          {showcaseData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className="w-28 h-1.5 bg-gray-700/80 rounded-full overflow-hidden"
              aria-label={`Go to slide ${index + 1}`}
            >
              <div
                className={`h-full bg-primary rounded-full origin-left progress-bar-${index}`}
                style={{ transform: activeIndex === index ? 'scaleX(1)' : 'scaleX(0)' }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoShowcase;