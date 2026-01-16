// src/app/components/landing/VideoShowcase.tsx

"use client";

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

const SLIDE_DURATION_MS = 5000; // 5 seconds per slide

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

const showcaseData = [
  {
    title: "WHERE LUXURY MEETS MOTIVATION",
    description:
      "Crafted for those who demand excellence.\nEvery detail reflects power, precision, and purpose.",
    cta: { text: "Discover The Tech", href: "/about" }
  },
  {
    title: "WEAR THE MINDSET OF SUCCESS",
    description:
      "CEASAR is more than clothing —\nit’s a statement of discipline, focus, and elevation.",
    cta: { text: "Our Mission", href: "/about" }
  },
  {
    title: "DESIGNED FOR THOSE WHO RISE",
    description:
      "Luxury fabrics. Timeless design.\nBuilt for individuals who never settle.",
    cta: { text: "Explore The Collection", href: "/shop" }
  }
];

const VideoShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressAnimation = useRef<gsap.core.Tween | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [videoEligible, setVideoEligible] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

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

  // Detect user/device preferences before ever loading the video asset
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

    const evaluateEligibility = () => {
      if (manualOverride) {
        setVideoEligible(true);
        return;
      }
      const prefersReducedMotion = reduceMotionQuery.matches;
      const saveData = Boolean(connection?.saveData);
      const slowConnection = Boolean(connection?.effectiveType && /(slow-)?2g|3g/i.test(connection.effectiveType));

      const eligible = !prefersReducedMotion && !saveData && !slowConnection;
      setVideoEligible(eligible);
      if (!eligible) {
        setShouldLoadVideo(false);
      }
    };

    evaluateEligibility();

    const handleChange = () => evaluateEligibility();
    reduceMotionQuery.addEventListener('change', handleChange);
    connection?.addEventListener?.('change', handleChange);

    return () => {
      reduceMotionQuery.removeEventListener('change', handleChange);
      connection?.removeEventListener?.('change', handleChange);
    };
  }, [manualOverride]);

  // Lazy-load the background video when the hero nears the viewport
  useEffect(() => {
    if (!videoEligible || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px' }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, [videoEligible]);

  // Ensure playback kicks in once sources attach
  useEffect(() => {
    if (!shouldLoadVideo || !videoEligible || !videoRef.current) return;
    const player = videoRef.current;
    const playPromise = player.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => undefined);
    }
  }, [shouldLoadVideo, videoEligible]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleManualStart = () => {
    setManualOverride(true);
    setVideoEligible(true);
    setShouldLoadVideo(true);
  };

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
    
    // Set up the interval for the next slide
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % showcaseData.length);
    }, SLIDE_DURATION_MS);

    // Cleanup function
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeIndex]);

  const handleSlideChange = (index: number) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
  };

  const activeSlide = showcaseData[activeIndex];

  return (
    <section ref={sectionRef} className="relative h-[90vh] min-h-[700px] w-full bg-brand-black text-white flex items-center">
      {/* Background Video */}
      {videoEligible ? (
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
          autoPlay
          loop
          muted
          playsInline
  
          preload={shouldLoadVideo ? 'metadata' : 'none'}
          onLoadedData={() => setVideoReady(true)}
        >
          {shouldLoadVideo && (
            <source src="/assets/v1sd.mp4" type="video/mp4" />
          )}
        </video>
      ) : (
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <Image
            src="/images/ELS08954.jpg"
            alt="Athletic apparel background"
            fill
            className="object-cover object-[center_30%]"
            priority
          />
        </div>
      )}
      {/* {!videoEligible && !manualOverride && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/60 px-6 py-3 text-sm font-semibold text-white uppercase tracking-widest shadow-lg">
            Video paused for slow connection
          </div>
        </div>
      )}
      {!videoEligible && !manualOverride && (
        <div className="absolute bottom-10 right-10 z-40">
          <button
            type="button"
            onClick={handleManualStart}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-full shadow-md hover:bg-primary/90"
          >
            Play background video
          </button>
        </div>
      )} */}
      {!videoReady && videoEligible && (
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <Image
            src="/images/H123.jpg"
            alt="Athletic apparel background placeholder"
            fill
            className="object-cover object-[center_30%]"
            priority
          />
        </div>
      )}
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 h-full flex flex-col justify-center lg:justify-end lg:pb-32">
        <div className="max-w-2xl">
          <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter whitespace-pre-line slide-title">{activeSlide.title}</h2>
          <p className="mt-6 text-lg text-gray-300 leading-relaxed whitespace-pre-line slide-description">{activeSlide.description}</p>
          <Link href={activeSlide.cta.href} className="group inline-flex items-center gap-3 mt-8 text-white font-bold text-lg slide-cta">
            <span>{activeSlide.cta.text}</span>
            <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-2" />
          </Link>
        </div>

        {/* Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 lg:left-6 lg:translate-x-0 lg:bottom-28 flex items-center gap-4">
          {showcaseData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className="w-24 h-1 bg-gray-700/80 rounded-full overflow-hidden"
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