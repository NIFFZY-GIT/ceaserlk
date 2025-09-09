// src/app/components/landing/BrandEthos.tsx

"use client";

import { useRef, useLayoutEffect } from 'react';
import { Zap, ShieldCheck, Users } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

const ethosData = [
  { icon: ShieldCheck, title: "Uncompromising Quality", description: "We obsess over every stitch and fiber to create apparel that performs under pressure and is built to last.", imageUrl: "/images/image.jpg" },
  { icon: Zap, title: "Performance Driven", description: "Our designs are born from the needs of athletes, engineered to enhance movement and unlock your full potential.", imageUrl: "/images/image.jpg" },
  { icon: Users, title: "Community Forged", description: "We are a brand built by and for a community of go-getters. Your ambition is our inspiration.", imageUrl: "/images/image.jpg" }
];

const BrandEthos = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      if (!section) return;

      const cards = gsap.utils.toArray<HTMLElement>(".ethos-card");
      const contents = gsap.utils.toArray<HTMLElement>(".card-content-wrapper");

      // Set initial state: first card is active, others are not.
      gsap.set(cards[0], { scale: 1, filter: "brightness(1)" });
      gsap.set(contents[0], { opacity: 1, y: 0 });
      gsap.set(cards.slice(1), { scale: 0.9, filter: "brightness(0.7)" });
      gsap.set(contents.slice(1), { opacity: 0, y: 30 });

      // Create a master timeline that is controlled by the scroll position
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1, // Smoothly link animation to scroll
        }
      });

      // Animate from card 1 to card 2
      tl.to(cards[0], { scale: 0.9, filter: "brightness(0.7)" }, "start")
        .to(contents[0], { opacity: 0, y: 30 }, "start")
        .to(cards[1], { scale: 1, filter: "brightness(1)" }, "start")
        .to(contents[1], { opacity: 1, y: 0 }, "start");

      // Animate from card 2 to card 3
      tl.to(cards[1], { scale: 0.9, filter: "brightness(0.7)" }, "middle")
        .to(contents[1], { opacity: 0, y: 30 }, "middle")
        .to(cards[2], { scale: 1, filter: "brightness(1)" }, "middle")
        .to(contents[2], { opacity: 1, y: 0 }, "middle");

        // Add labels to the timeline for clear animation points
      tl.addLabel("start", 0)
        .addLabel("middle", 0.5);

    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    // This is now a normal-scrolling section, no pinning, no fixed height.
    <section ref={sectionRef} className="w-full py-24 bg-brand-black md:py-32">
      <div className="container px-6 mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-wider text-white uppercase md:text-5xl">
            The Ceaser Ethos
          </h2>
        </div>
        
        {/* A simple, user-friendly vertical grid layout */}
        <div className="grid grid-cols-1 gap-16 md:gap-24">
          {ethosData.map((item, index) => (
            <div 
              key={index}
              // The card itself is much larger to create a bigger impact
              className="relative h-[70vh] max-h-[600px] w-full max-w-4xl mx-auto rounded-2xl overflow-hidden ethos-card"
            >
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="100vw"
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-end p-8 text-center text-white card-content-wrapper">
                <item.icon className="mb-4 w-14 h-14 text-primary" />
                <h3 className="mb-3 text-3xl font-bold">{item.title}</h3>
                <p className="max-w-md text-base leading-relaxed text-gray-300">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandEthos;