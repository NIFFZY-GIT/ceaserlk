'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Error boundary captured an error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-32 h-32 bg-red-500/10 rounded-full border-2 border-red-500">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-brand-black">Oops! Something went wrong</h1>
          <p className="text-xl text-gray-600">
            An error occurred while processing your request. Please try again.
          </p>
        </div>

        {/* Reference Code */}
        {error.digest && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Error Reference:</span> <code className="text-xs bg-gray-100 px-2 py-1 rounded">{error.digest}</code>
            </p>
          </div>
        )}

        {/* Error Details in Development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <summary className="font-semibold text-red-900 cursor-pointer">Error Details</summary>
            <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-32 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:opacity-90 text-white rounded-lg transition-all duration-200 font-semibold gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-brand-black rounded-lg transition-colors duration-200 font-semibold gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        {/* Quick Links */}
        <div className="pt-8 border-t border-gray-200">
          <p className="text-gray-700 mb-6 font-semibold">Quick Navigation</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              href="/shop"
              className="p-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium text-sm"
            >
              Shop
            </Link>
            <Link
              href="/about"
              className="p-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium text-sm"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="p-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-800 hover:text-primary font-medium text-sm"
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="pt-4 text-gray-600 text-sm">
          <p>
            If this problem persists,{' '}
            <Link href="/contact" className="text-primary font-semibold hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
