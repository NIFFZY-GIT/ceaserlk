// src/app/components/Footer.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="text-white bg-brand-black">
      <div className="container px-6 mx-auto">
        {/* Section 1: Newsletter Signup */}
        <div className="flex flex-col items-center justify-between gap-8 py-16 border-b border-gray-800 lg:flex-row">
          <div>
            <h2 className="text-3xl font-bold tracking-wider uppercase md:text-4xl">
              Join the Movement
            </h2>
            <p className="max-w-lg mt-2 text-gray-400">
              Get exclusive access to new drops, special offers, and the relentless mindset delivered to your inbox.
            </p>
          </div>
          <form className="w-full max-w-md">
            <div className="flex items-center overflow-hidden bg-gray-900 border border-gray-700 rounded-md">
              <input 
                type="email"
                placeholder="Enter your email"
                className="w-full p-4 text-white placeholder-gray-500 bg-transparent focus:outline-none"
                aria-label="Email for newsletter"
              />
              <button 
                type="submit" 
                className="p-4 text-white transition-colors bg-accent hover:bg-red-700"
                aria-label="Subscribe to newsletter"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Main Footer Links */}
        <div className="grid grid-cols-2 gap-8 py-16 md:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image src="/assets/log1.png" alt="Ceaser Brand Logo" width={150} height={63} unoptimized />
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Apparel engineered for the relentless pursuit of greatness.
            </p>
          </div>

          {/* Column 2: Shop */}
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wider uppercase">Shop</h3>
            <ul className="space-y-3">
              <li><Link href="/shop" className="text-gray-400 transition-colors hover:text-primary">All Products</Link></li>
              <li><Link href="/collections/new-arrivals" className="text-gray-400 transition-colors hover:text-primary">New Arrivals</Link></li>
              <li><Link href="/collections/best-sellers" className="text-gray-400 transition-colors hover:text-primary">Best Sellers</Link></li>
              <li><Link href="/collections/on-sale" className="text-gray-400 transition-colors hover:text-primary">On Sale</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wider uppercase">Support</h3>
            <ul className="space-y-3">
              <li><Link href="/faq" className="text-gray-400 transition-colors hover:text-primary">FAQ</Link></li>
              <li><Link href="/contact" className="text-gray-400 transition-colors hover:text-primary">Contact Us</Link></li>
              <li><Link href="/shipping" className="text-gray-400 transition-colors hover:text-primary">Shipping & Returns</Link></li>
              <li><Link href="/size-guide" className="text-gray-400 transition-colors hover:text-primary">Size Guide</Link></li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wider uppercase">Company</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-gray-400 transition-colors hover:text-primary">Our Mission</Link></li>
              <li><Link href="/blog" className="text-gray-400 transition-colors hover:text-primary">Blog</Link></li>
              <li><Link href="/careers" className="text-gray-400 transition-colors hover:text-primary">Careers</Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Section 3: Bottom Bar (Copyright & Socials) */}
      <div className="py-6 bg-black">
          <div className="container flex flex-col items-center justify-between gap-4 px-6 mx-auto md:flex-row">
            <p className="text-sm text-center text-gray-500 md:text-left">
              © {new Date().getFullYear()} Ceaser Brand. All Rights Reserved.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="#" className="text-gray-400 transition-colors hover:text-primary" aria-label="Facebook"><Facebook size={20} /></Link>
              <Link href="#" className="text-gray-400 transition-colors hover:text-primary" aria-label="Instagram"><Instagram size={20} /></Link>
              <Link href="#" className="text-gray-400 transition-colors hover:text-primary" aria-label="Twitter"><Twitter size={20} /></Link>
            </div>
          </div>
      </div>
    </footer>
  );
};

export default Footer;