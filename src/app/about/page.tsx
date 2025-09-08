// src/app/about/page.tsx

"use client"; // This component MUST be a client component for GSAP and hooks to work.

import { useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Users, Zap, Target, Milestone, PackageCheck } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register the ScrollTrigger plugin with GSAP
gsap.registerPlugin(ScrollTrigger);

// Data for our animated timeline
const timelineEvents = [
  { year: '2021', title: 'The Spark', description: 'The idea for Ceaser was born from a desire for apparel that matched our ambition.', icon: Target },
  { year: '2022', title: 'Design & Prototype', description: 'Countless hours spent perfecting the fit, fabric, and function of our flagship products.', icon: Milestone },
  { year: '2023', title: 'Brand Launch', description: 'Ceaser officially launched, shipping our first orders to a community of high-performers.', icon: PackageCheck },
];

const AboutPage = () => {
  const main = useRef(null);

  // useLayoutEffect is preferred for animations that measure/manipulate the DOM
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // --- HERO ANIMATION ---
      // Animate the title words sliding up one by one
      gsap.from(".hero-title-word > span", {
        y: "100%",
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
        delay: 0.3,
      });

      // --- GENERIC FADE-IN ANIMATION on Scroll ---
      // Find all elements with the class 'gsap-fade-in' and animate them
      const fadeElements = gsap.utils.toArray('.gsap-fade-in');
  fadeElements.forEach((el) => {
        const element = el as Element;
        gsap.from(element, {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%', // Start animation when top of element is 85% down the viewport
            toggleActions: 'play none none none',
          },
        });
      });
      
      // --- TIMELINE DRAWING ANIMATION ---
      const timelineSection = document.querySelector('.timeline-section');
      if (timelineSection) {
        // Animate the vertical line drawing itself as you scroll
        gsap.from(".timeline-line", {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 1.5,
          ease: 'none',
          scrollTrigger: {
            trigger: timelineSection,
            start: 'top center',
            end: 'bottom bottom',
            scrub: true,
          }
        });
        
        // Animate each timeline item fading in as it's passed
        const items = gsap.utils.toArray('.timeline-item');
  items.forEach((item) => {
          const element = item as Element;
          gsap.from(element, {
            opacity: 0,
            x: -50,
            scrollTrigger: {
              trigger: element,
              start: 'top 80%',
              end: 'top 50%',
              scrub: true,
            }
          });
        });
      }

    }, main); // <- scope the context to our main element

    // Cleanup function to revert all animations when the component unmounts
    return () => ctx.revert();
  }, []);

  return (
    <main ref={main} className="bg-brand-black text-white overflow-x-hidden">
      {/* Section 1: Dynamic Hero */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center p-6">
        <Image
          src="/images/image.jpg"
          alt="An abstract, modern background texture"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="relative z-10">
          <h1 className="text-5xl md:text-8xl font-extrabold uppercase tracking-tighter">
            <div className="hero-title-word overflow-hidden pb-2"><span className="inline-block">Built,</span></div>
            <div className="hero-title-word overflow-hidden pb-2"><span className="inline-block">Not</span></div>
            <div className="hero-title-word overflow-hidden"><span className="inline-block">Born.</span></div>
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-gray-300 gsap-fade-in">
            Ceaser is more than a brand. It&apos;s a testament to the power of relentless effort and uncompromising standards.
          </p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 text-sm animate-bounce">Scroll Down</div>
      </section>

      {/* Section 2: Our Philosophy */}
      <section className="container mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="gsap-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
              The Philosophy of the Grind
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-4">
              We believe greatness isn&apos;t a gift; it&apos;s earned. Every day is an opportunity to be better than you were yesterday. That&apos;s the mindset we embed into every fiber of our apparel.
            </p>
            <p className="text-gray-300 leading-relaxed text-lg">
              Our products are designed for the critical moments—the final rep, the extra mile, the breakthrough idea. They are engineered to perform under pressure, just like you.
            </p>
          </div>
          <div className="relative w-full h-96 gsap-fade-in">
            <Image
              src="/images/image.jpg"
              alt="Athlete in deep focus"
              fill
              className="rounded-lg object-cover shadow-2xl shadow-primary/20"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Our Journey (Timeline) */}
      <section className="bg-gray-900/50 py-24 md:py-32 timeline-section">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 gsap-fade-in">Our Journey</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-20 gsap-fade-in">
            A look back at the milestones that shaped us.
          </p>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary/30 timeline-line"></div>
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              return (
                <div key={index} className="mb-16 flex items-center w-full timeline-item">
                  <div className={`flex w-full items-center ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8' : 'pl-8 text-right'}`}>
                      <p className="text-primary font-semibold mb-1">{event.year}</p>
                      <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                      <p className="text-gray-400">{event.description}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-brand-black border-2 border-primary rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Section 4: Our Ethos (Values) */}
      <section className="container mx-auto px-6 py-24 md:py-32 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-16 gsap-fade-in">The Ceaser Ethos</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { icon: ShieldCheck, title: "Uncompromising Quality", text: "We obsess over every detail, from sourcing premium fabrics to ensuring flawless construction." },
            { icon: Zap, title: "Performance-Driven", text: "Innovation is in our DNA. We craft apparel that actively enhances your performance." },
            { icon: Users, title: "Community-Forged", text: "We are built by and for a community of relentless individuals. Your success is our motivation." }
          ].map((value, index) => (
            <div key={index} className="p-8 bg-gray-900/50 rounded-lg border border-gray-800 gsap-fade-in">
              <value.icon className="w-12 h-12 mx-auto text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-3">{value.title}</h3>
              <p className="text-gray-400">{value.text}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Section 5: Final Call to Action */}
      <section className="py-24 md:py-32 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-brand-black gsap-fade-in">
            Your Ambition. Your Armor.
          </h2>
          <p className="max-w-xl mx-auto mb-8 text-gray-800 gsap-fade-in">
            Step into apparel that&apos;s as committed to your goals as you are.
          </p>
          <Link href="/shop" className="gsap-fade-in inline-block bg-brand-black text-white font-bold py-4 px-10 rounded-md uppercase tracking-wider transition-transform duration-300 hover:scale-105 hover:bg-gray-800">
            Explore The Collection
          </Link>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;