// src/app/components/Footer.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-brand-black text-white">
      <div className="container mx-auto px-6">
        {/* Section 1: Newsletter Signup */}
        <div className="py-16 flex flex-col lg:flex-row items-center justify-between gap-8 border-b border-gray-800">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-wider">
              Join the Movement
            </h2>
            <p className="text-gray-400 mt-2 max-w-lg">
              Get exclusive access to new drops, special offers, and the relentless mindset delivered to your inbox.
            </p>
          </div>
          <form className="w-full max-w-md">
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-md overflow-hidden">
              <input 
                type="email"
                placeholder="Enter your email"
                className="w-full p-4 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                aria-label="Email for newsletter"
              />
              <button 
                type="submit" 
                className="bg-accent text-white p-4 transition-colors hover:bg-red-700"
                aria-label="Subscribe to newsletter"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Main Footer Links */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <Image src="/assets/logo1.png" alt="Ceaser Brand Logo" width={150} height={63} />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Apparel engineered for the relentless pursuit of greatness.
            </p>
          </div>

          {/* Column 2: Shop */}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-4">Shop</h3>
            <ul className="space-y-3">
              <li><Link href="/shop" className="text-gray-400 hover:text-primary transition-colors">All Products</Link></li>
              <li><Link href="/collections/new-arrivals" className="text-gray-400 hover:text-primary transition-colors">New Arrivals</Link></li>
              <li><Link href="/collections/best-sellers" className="text-gray-400 hover:text-primary transition-colors">Best Sellers</Link></li>
              <li><Link href="/collections/on-sale" className="text-gray-400 hover:text-primary transition-colors">On Sale</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-4">Support</h3>
            <ul className="space-y-3">
              <li><Link href="/faq" className="text-gray-400 hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/shipping" className="text-gray-400 hover:text-primary transition-colors">Shipping & Returns</Link></li>
              <li><Link href="/size-guide" className="text-gray-400 hover:text-primary transition-colors">Size Guide</Link></li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-gray-400 hover:text-primary transition-colors">Our Mission</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="text-gray-400 hover:text-primary transition-colors">Careers</Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Section 3: Bottom Bar (Copyright & Socials) */}
      <div className="bg-black py-6">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Ceaser Brand. All Rights Reserved.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Facebook"><Facebook size={20} /></Link>
              <Link href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Instagram"><Instagram size={20} /></Link>
              <Link href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Twitter"><Twitter size={20} /></Link>
            </div>
          </div>
      </div>
    </footer>
  );
};

export default Footer;