// src/app/contact/page.tsx

"use client"; // This MUST be a client component for GSAP and hooks to work.

import { useRef, useLayoutEffect } from 'react';
import { Mail, Phone, Clock, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register the ScrollTrigger plugin with GSAP
gsap.registerPlugin(ScrollTrigger);

const ContactPage = () => {
  const mainRef = useRef(null);

  useLayoutEffect(() => {
    // Create a GSAP context for safe animation cleanup
    const ctx = gsap.context(() => {
      
      // --- HERO TITLE ANIMATION ---
      gsap.from(".hero-title-word > span", {
        y: "110%",
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.2,
        delay: 0.2,
      });

      gsap.from(".hero-subtitle", {
        y: 20,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.8,
      });

      // --- SCROLL-TRIGGERED FORM & INFO ANIMATION ---
      // Animate the Contact Info items one by one
      gsap.from(".info-item", {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".gsap-contact-info",
          start: 'top 80%', // Start when the top of the container is 80% down the viewport
          toggleActions: 'play none none none',
        },
      });

      // Animate the Form fields one by one
      gsap.from(".form-field", {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".gsap-contact-form",
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

    }, mainRef); // Scope the animations to our main element

    // Cleanup function to revert all animations when the component unmounts
    return () => ctx.revert();
  }, []);

  return (
    <main ref={mainRef} className="bg-brand-black text-white overflow-x-hidden">
      <div className="container mx-auto px-6 py-24 md:py-32">
        {/* Section 1: Page Header with Animated Title */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tighter">
            <div className="hero-title-word overflow-hidden pb-2"><span className="inline-block">Get</span></div>
            <div className="hero-title-word overflow-hidden pb-2"><span className="inline-block">In</span></div>
            <div className="hero-title-word overflow-hidden"><span className="inline-block">Touch.</span></div>
          </h1>
          <p className="mt-6 text-lg text-gray-400 hero-subtitle">
            Have a question, feedback, or a partnership inquiry? We&apos;re here to help. Reach out to us through any of the channels below.
          </p>
        </div>

        {/* Section 2: Main Content (Grid Layout) */}
        <div className="grid md:grid-cols-2 gap-16 items-start">
          
          {/* Column 1: Contact Information & Details */}
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-800 gsap-contact-info">
            <h2 className="text-3xl font-bold text-primary mb-6 info-item">Contact Information</h2>
            <p className="text-gray-400 mb-8 info-item">
              Fill out the form, and our team will get back to you within 24-48 business hours. For quicker answers, check out our FAQ.
            </p>

            <ul className="space-y-6">
              <li className="flex items-center gap-4 info-item">
                <Mail className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Email Us</h3>
                  <a href="mailto:support@ceaserbrand.com" className="text-gray-300 hover:text-white transition-colors">support@ceaserbrand.com</a>
                </div>
              </li>
              <li className="flex items-center gap-4 info-item">
                <Phone className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Call Us</h3>
                  <a href="tel:+1234567890" className="text-gray-300 hover:text-white transition-colors">+1 (234) 567-890</a>
                </div>
              </li>
              <li className="flex items-center gap-4 info-item">
                <Clock className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Business Hours</h3>
                  <p className="text-gray-300">Mon - Fri: 9am - 5pm EST</p>
                </div>
              </li>
              <li className="flex items-center gap-4 info-item">
                <HelpCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Frequently Asked Questions</h3>
                  <Link href="/faq" className="text-gray-300 hover:text-white transition-colors underline">Visit our FAQ page</Link>
                </div>
              </li>
            </ul>
          </div>
          
          {/* Column 2: Contact Form */}
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-800 gsap-contact-form">
            <h2 className="text-3xl font-bold text-primary mb-6 form-field">Send a Message</h2>
            <form className="space-y-6">
              <div className="form-field">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input type="text" id="name" name="name" required className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-white focus:ring-2 focus:ring-primary focus:border-primary transition" />
              </div>
              <div className="form-field">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input type="email" id="email" name="email" required className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-white focus:ring-2 focus:ring-primary focus:border-primary transition" />
              </div>
              <div className="form-field">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <select id="subject" name="subject" required className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-white focus:ring-2 focus:ring-primary focus:border-primary transition appearance-none">
                  <option>General Inquiry</option>
                  <option>Order Support</option>
                  <option>Shipping & Returns</option>
                  <option>Partnership</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea id="message" name="message" rows={5} required className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-white focus:ring-2 focus:ring-primary focus:border-primary transition"></textarea>
              </div>
              <div className="form-field">
                <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-6 rounded-md uppercase tracking-wider transition-transform duration-300 hover:scale-105 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-black focus:ring-accent">
                  Submit Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;