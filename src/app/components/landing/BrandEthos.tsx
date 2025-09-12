// src/app/components/landing/BrandEthos.tsx

"use client";

import { useRef, useLayoutEffect } from 'react';
import { Zap, ShieldCheck, Users } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

const ethosData = [
  { 
    icon: ShieldCheck, 
    title: "Uncompromising Quality", 
    description: "We obsess over every stitch and fiber to create apparel that performs under pressure and is built to last.", 
    imageUrl: "/images/image.jpg" // Use distinct, high-quality images
  },
  { 
    icon: Zap, 
    title: "Performance Driven", 
    description: "Our designs are born from the needs of athletes, engineered to enhance movement and unlock your full potential.", 
    imageUrl:"/images/image1.jpg"
  },
  { 
    icon: Users, 
    title: "Community Forged", 
    description: "We are a brand built by and for a community of go-getters. Your ambition is our inspiration.", 
    imageUrl: "/images/image.jpg"
  }
];

const BrandEthos = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Use matchMedia for responsive animations
      ScrollTrigger.matchMedia({
        
        // ===========================================
        // DESKTOP ANIMATION (screens > 768px)
        // ===========================================
        "(min-width: 768px)": function() {
          const section = sectionRef.current;
          if (!section) return;

          const slides = gsap.utils.toArray<HTMLElement>(".ethos-slide-desktop");
          const texts = gsap.utils.toArray<HTMLElement>(".ethos-text-item");
          const progressBar = section.querySelector<HTMLElement>(".progress-bar-inner");
          
          let lastIndex = -1; // Use -1 to ensure the first update always runs

          // Pin the main section and animate the horizontal slide
          gsap.to(slides, {
            xPercent: -100 * (slides.length - 1),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              pin: true,
              scrub: 0.5, // A little scrub gives a smoother feel
              snap: 1 / (slides.length - 1), // Snap to each section
              end: () => `+=${section.offsetWidth * (slides.length - 1)}`,

              // onUpdate handles the text transitions and progress bar
              onUpdate: self => {
                const newIndex = Math.round(self.progress * (slides.length - 1));

                if (newIndex !== lastIndex) {
                  // Animate OUT the old text (if it exists)
                  if (lastIndex !== -1) {
                    gsap.to(texts[lastIndex], { autoAlpha: 0, y: -20, duration: 0.4, ease: "power2.in" });
                  }
                  
                  // Animate IN the new text
                  gsap.fromTo(texts[newIndex], 
                    { autoAlpha: 0, y: 20 }, 
                    { autoAlpha: 1, y: 0, duration: 0.4, delay: 0.3, ease: "power2.out" }
                  );

                  lastIndex = newIndex;
                }

                // Update the progress bar
                gsap.to(progressBar, { scaleX: self.progress, duration: 0.1, ease: 'none' });
              },
            }
          });
          
          // Set initial state for the first text item
          gsap.set(texts[0], { autoAlpha: 1, y: 0 });
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden text-white bg-brand-black">
      
      {/* ========================================================
          DESKTOP LAYOUT - Fullscreen, Sticky, Horizontal Scroll
          ======================================================== */}
      <div className="hidden w-full h-screen md:flex">
        {/* Horizontal container for image slides */}
        <div className="absolute top-0 left-0 flex w-full h-full">
          {ethosData.map((item, index) => (
            <div key={index} className="relative flex-shrink-0 w-screen h-screen ethos-slide-desktop">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                priority={index === 0} // Prioritize loading the first image
                sizes="100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Sticky Text and UI Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-12 lg:p-20 bg-gradient-to-r from-black/80 via-black/60 to-transparent">
          {/* Top Section: Title */}
          <div>
            <h2 className="text-4xl font-bold tracking-wider uppercase lg:text-5xl">
              The Ceaser Ethos
            </h2>
          </div>

          {/* Middle Section: Dynamic Text Content */}
          <div className="relative w-full max-w-lg">
            {ethosData.map((item, index) => (
              <div key={index} className="absolute flex items-start invisible gap-5 ethos-text-item">
                <item.icon className="flex-shrink-0 w-10 h-10 mt-1 lg:w-12 lg:h-12 text-primary" strokeWidth={1.5} />
                <div>
                  <h3 className="mb-3 text-3xl font-semibold lg:text-4xl">{item.title}</h3>
                  <p className="text-lg leading-relaxed text-gray-300">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Section: Progress Bar */}
          <div className="w-full max-w-lg">
            <div className="w-full h-1 rounded-full progress-bar-container bg-white/20">
              <div className="w-full h-full bg-white rounded-full progress-bar-inner" style={{ transform: 'scaleX(0)', transformOrigin: 'left' }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* ==============================================
          MOBILE LAYOUT - Simple, Elegant Vertical Stack
          ============================================== */}
      <div className="container px-6 py-24 mx-auto md:hidden">
         <h2 className="mb-16 text-4xl font-bold tracking-wider text-center uppercase">
            The Ceaser Ethos
          </h2>
        <div className="grid grid-cols-1 gap-16">
          {ethosData.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="relative w-full max-w-sm mb-8 overflow-hidden shadow-lg h-96 rounded-xl">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="90vw"
                  className="object-cover"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <item.icon className="w-12 h-12 mb-4 text-primary" />
              <h3 className="mb-2 text-3xl font-semibold">{item.title}</h3>
              <p className="max-w-md text-gray-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandEthos;