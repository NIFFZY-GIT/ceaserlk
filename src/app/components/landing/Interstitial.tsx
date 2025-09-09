// src/app/components/landing/Interstitial.tsx

"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

const Interstitial = () => {
  const sectionRef = useRef(null);
  
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Parallax background animation
      gsap.to(".gsap-parallax-bg", {
        yPercent: 20, // Move the image down by 20% of its height
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom', // Start when the top of the section hits the bottom of the viewport
          end: 'bottom top', // End when the bottom of the section hits the top
          scrub: true // Smoothly link the animation to the scrollbar
        }
      });
      
      // 2. Main content reveal timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
          toggleActions: 'play none none none'
        }
      });
      
      tl.from(".gsap-bg-logo", { scale: 0.8, opacity: 0, duration: 1, ease: 'power3.out' })
        .from(".gsap-word > span", {
            yPercent: 110,
            opacity: 0,
            stagger: 0.1,
            duration: 0.8,
            ease: 'power3.out'
        }, "-=0.7")
        .from(".gsap-para", { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, "-=0.5")
        .from(".gsap-cta-button", { scale: 0.9, opacity: 0, duration: 0.8, ease: 'power3.out' }, "-=0.5");

    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    // The section needs to be relative and overflow-hidden for the parallax effect
    <section ref={sectionRef} className="relative py-32 overflow-hidden bg-brand-black md:py-40">
      {/* Parallax Background Image */}
      <Image
        src="/images/interstitial-bg.jpg"
        alt="Atmospheric background"
        fill
        className="object-cover w-full h-full opacity-10 gsap-parallax-bg"
      />
      
      <div className="container relative z-10 max-w-3xl px-6 mx-auto text-center">
        {/* Semi-transparent background logo for depth */}
        <Image
            src="/assets/logo1.png" // Assuming this is your logo path
            alt="Ceaser Brand Logo Mark"
            width={200}
            height={84}
            className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 opacity-5 gsap-bg-logo"
        />

        <h2 className="text-4xl font-bold tracking-wider text-white uppercase md:text-6xl">
            {/* The double-span structure allows for the word-by-word reveal animation */}
            <span className="inline-block overflow-hidden gsap-word"><span className="inline-block">Beyond</span></span>{' '}
            <span className="inline-block overflow-hidden gsap-word"><span className="inline-block">the</span></span>{' '}
            <span className="inline-block overflow-hidden gsap-word"><span className="inline-block">Apparel</span></span>
        </h2>
        
        <p className="mt-6 text-lg leading-relaxed text-gray-400 gsap-para">
          We believe in the power of mindset. Our brand is a tribute to the discipline, resilience, and relentless drive it takes to achieve greatness.
        </p>
        
        <div className="mt-12 gsap-cta-button">
          <Link href="/about" className="inline-flex items-center gap-3 px-8 py-4 font-bold text-white transition-all duration-300 rounded-md group bg-primary hover:scale-105 hover:shadow-lg hover:shadow-primary/30">
            <span>Discover Our Mission</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Interstitial;