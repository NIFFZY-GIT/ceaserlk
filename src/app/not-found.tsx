'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Content */}
        <div className="text-center space-y-8">
          {/* 404 Display */}
          <div className="space-y-4">
            <div className="text-8xl md:text-9xl font-bold text-brand-black">
              404
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-brand-black">
              Page Not Found
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
          </div>

          {/* Illustration */}
          <div className="py-8">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-primary/10 rounded-full border-2 border-primary">
              <Search className="w-16 h-16 text-primary opacity-100" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-brand-black rounded-lg transition-colors duration-200 gap-2 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:opacity-90 text-white rounded-lg transition-all duration-200 font-semibold gap-2"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </div>

          {/* Quick Links */}
          <div className="pt-12 border-t border-gray-200">
            <p className="text-gray-700 mb-6 font-semibold">Quick Navigation</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                href="/shop"
                className="p-4 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium"
              >
                <div className="text-2xl mb-2">🛍️</div>
                <span className="text-sm">Shop</span>
              </Link>
              <Link
                href="/about"
                className="p-4 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium"
              >
                <div className="text-2xl mb-2">ℹ️</div>
                <span className="text-sm">About</span>
              </Link>
              <Link
                href="/contact"
                className="p-4 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium"
              >
                <div className="text-2xl mb-2">💬</div>
                <span className="text-sm">Contact</span>
              </Link>
              <Link
                href="/faq"
                className="p-4 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium"
              >
                <div className="text-2xl mb-2">❓</div>
                <span className="text-sm">FAQ</span>
              </Link>
            </div>
          </div>

          {/* Error Code */}
          <div className="pt-8 text-gray-500 text-sm">
            <p>Error Code: 404 - Not Found</p>
            <p className="text-xs mt-1">If you believe this is a mistake, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
