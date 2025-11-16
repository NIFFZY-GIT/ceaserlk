// src/app/components/Footer.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="text-white bg-brand-black">
      <div className="relative container px-6 mx-auto">
        <a
          href="https://koombiyodelivery.lk/track"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-6 right-6 inline-flex items-center justify-center px-5 py-2 text-sm font-semibold transition-colors border rounded-full bg-blue-500 hover:bg-blue-600 text-brand-white border-blue-500/70"
        >
          Track Delivery
        </a>
        {/* Section 2: Main Footer Links */}
        <div className="grid grid-cols-2 gap-8 py-16 md:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image src="/images/logo1.png" alt="Ceaser Brand Logo" width={150} height={63} priority />
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
      
      {/* Section 3: Bottom Bar (Credits & Socials) */}
      <div className="py-6 bg-black border-t border-gray-800/80">
        <div className="container flex flex-col items-center justify-between gap-4 px-6 mx-auto text-center md:flex-row md:text-left">
          <div className="space-y-2 text-sm text-center md:text-left">
            <p className="font-semibold tracking-wide text-gray-300">
              © {new Date().getFullYear()} Ceaser.lk • All rights reserved • Designed &amp; developed by{' '}
              <a
                href="https://zevarone.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors text-white hover:text-primary"
              >
                ZEVARONE
              </a>
            </p>
          </div>
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