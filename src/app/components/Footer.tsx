// src/app/components/Footer.tsx

import Link from 'next/link';
import { Twitter, Instagram, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-primary text-brand-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          
          {/* Brand & Mission */}
          <div className="flex flex-col items-center md:items-start">
            <h2 className="text-2xl font-bold mb-2">CEASER</h2>
            <p className="text-sm text-gray-300 max-w-xs">
              Unleash Your Potential. Wear Your Motivation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><Link href="/shop" className="hover:text-accent transition-colors">All Products</Link></li>
              <li><Link href="/about" className="hover:text-accent transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="font-bold text-lg mb-4">Follow Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="#" aria-label="Twitter" className="hover:text-accent transition-colors"><Twitter size={24} /></a>
              <a href="#" aria-label="Instagram" className="hover:text-accent transition-colors"><Instagram size={24} /></a>
              <a href="#" aria-label="Facebook" className="hover:text-accent transition-colors"><Facebook size={24} /></a>
            </div>
          </div>

        </div>

        {/* Copyright Bar */}
        <div className="border-t border-green-800 mt-10 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Ceaser. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;