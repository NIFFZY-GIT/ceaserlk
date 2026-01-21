// src/app/components/Footer.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-brand-black text-white border-t border-gray-800/80">
      <div className="container px-4 sm:px-6 mx-auto">
        <div className="grid grid-cols-1 gap-10 py-12 sm:py-14 md:grid-cols-12">
          {/* Brand block */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/images/logo1.png"
                alt="Ceaser Brand Logo"
                width={140}
                height={58}
                priority
                className="w-auto h-9 sm:h-10"
              />
            </Link>
            <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-gray-400">
              Apparel engineered for the relentless pursuit of greatness.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="https://koombiyodelivery.lk/track"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Track Delivery
              </a>
              <Link
                href="/track-order"
                className="inline-flex items-center justify-center rounded-full border border-gray-800/80 bg-black/30 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-200 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Track Order
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-800/80 bg-black/30 text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-800/80 bg-black/30 text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-800/80 bg-black/30 text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-7">
            <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-3">
              {/* Column: Shop */}
              <div>
                <h3 className="mb-4 text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-200">Shop</h3>
                <ul className="space-y-2.5">
                  <li><Link href="/shop" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">All Products</Link></li>
                  <li><Link href="/collections/new-arrivals" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">New Arrivals</Link></li>
                  <li><Link href="/collections/best-sellers" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Best Sellers</Link></li>
                  <li><Link href="/collections/on-sale" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">On Sale</Link></li>
                </ul>
              </div>

              {/* Column: Support */}
              <div>
                <h3 className="mb-4 text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-200">Support</h3>
                <ul className="space-y-2.5">
                  <li><Link href="/contact" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Contact Us</Link></li>
                  <li><Link href="/refund-policy" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Refund Policy</Link></li>
                  <li><Link href="/terms-conditions" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Terms</Link></li>
                  <li><Link href="/privacy-policy" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Privacy</Link></li>
                  <li><Link href="/size-guide" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Size Guide</Link></li>
                </ul>
              </div>

              {/* Column: Company */}
              <div>
                <h3 className="mb-4 text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-200">Company</h3>
                <ul className="space-y-2.5">
                  <li><Link href="/about" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Our Mission</Link></li>
                  <li><Link href="/blog" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Blog</Link></li>
                  <li><Link href="/careers" className="text-xs sm:text-sm text-gray-400 transition-colors hover:text-primary">Careers</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section 3: Bottom Bar (Credits & Socials) */}
      <div className="bg-black border-t border-gray-800/80">
        <div className="container flex flex-col items-center justify-between gap-2 px-4 py-5 sm:px-6 sm:py-6 mx-auto text-center md:flex-row md:text-left">
          <p className="text-[10px] sm:text-xs text-gray-400">
            © {new Date().getFullYear()} inceasar.com. All rights reserved.
          </p>

          <a
            href="https://zevarone.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gray-800/80 bg-black/30 px-3 py-1.5 text-[10px] sm:text-xs text-gray-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Designed and Developed by ZEVARONE"
          >
            <span className="text-gray-400">Designed &amp; Developed by</span>
            <span className="font-semibold tracking-wide text-white">ZEVARONE</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;