"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-[150px] md:text-[200px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent leading-none">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <p className="text-gray-500">
            Don&apos;t worry, even champions take wrong turns sometimes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link 
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors duration-300"
          >
            <Home size={20} />
            Go Home
          </Link>
          
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-300"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          
          <Link 
            href="/shop"
            className="flex items-center gap-2 px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors duration-300"
          >
            <ShoppingBag size={20} />
            Shop Now
          </Link>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Looking for something specific?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Link 
              href="/shop" 
              className="text-gray-600 hover:text-primary transition-colors duration-200 flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
            >
              <ShoppingBag size={24} />
              <span>Shop</span>
            </Link>
            
            <Link 
              href="/about" 
              className="text-gray-600 hover:text-primary transition-colors duration-200 flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
            >
              <Search size={24} />
              <span>About Us</span>
            </Link>
            
            <Link 
              href="/contact" 
              className="text-gray-600 hover:text-primary transition-colors duration-200 flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Contact</span>
            </Link>
            
            <Link 
              href="/profile" 
              className="text-gray-600 hover:text-primary transition-colors duration-200 flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile</span>
            </Link>
          </div>
        </div>

        {/* Brand Message */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Need help? <Link href="/contact" className="text-primary hover:underline">Contact our support team</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
