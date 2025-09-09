// src/app/components/landing/VideoShowcase.tsx

"use client";

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SLIDE_DURATION_MS = 5000; // 5 seconds per slide

const showcaseData = [
  {
    title: "Engineered for Performance",
    description: "Every stitch, seam, and fabric is chosen with one goal: to help you push your limits. Our apparel moves with you, not against you.",
    cta: { text: "Discover The Tech", href: "/about" }
  },
  {
    title: "The Mindset is Everything",
    description: "Ceaser isn't just what you wear; it's a statement. It's for those who show up, do the work, and refuse to be outworked.",
    cta: { text: "Our Mission", href: "/about" }
  },
  {
    title: "Join The Movement",
    description: "Become part of a community dedicated to relentless self-improvement. Your journey is our inspiration.",
    cta: { text: "Explore The Collection", href: "/shop" }
  }
];

const VideoShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);
  const progressAnimation = useRef<gsap.core.Tween | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      <video
        src="/assets/v1.mp4" // You'll need to add a video file here
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/70 z-10" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 h-full flex flex-col justify-center lg:justify-end lg:pb-32">
        <div className="max-w-2xl">
          <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter slide-title">{activeSlide.title}</h2>
          <p className="mt-6 text-lg text-gray-300 leading-relaxed slide-description">{activeSlide.description}</p>
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