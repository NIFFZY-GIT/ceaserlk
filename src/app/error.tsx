"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold text-red-500 mb-4">
            500
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Something Went Wrong
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            We&apos;re experiencing some technical difficulties.
          </p>
          <p className="text-gray-500">
            Our team has been notified and is working to fix this issue.
          </p>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm font-medium text-red-800 mb-2">Development Error Details:</p>
              <p className="text-xs text-red-700 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button 
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors duration-300"
          >
            <RefreshCw size={20} />
            Try Again
          </button>
          
          <Link 
            href="/"
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-300"
          >
            <Home size={20} />
            Go Home
          </Link>
        </div>

        {/* Support Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Need Immediate Help?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <div className="w-8 h-8 mx-auto mb-2 text-gray-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Email Support</h4>
              <Link 
                href="/contact" 
                className="text-primary hover:underline text-sm"
              >
                Contact Us
              </Link>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <div className="w-8 h-8 mx-auto mb-2 text-gray-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Help Center</h4>
              <Link 
                href="/about" 
                className="text-primary hover:underline text-sm"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Error ID for Support */}
        {error.digest && (
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-xs">
              Reference ID: <span className="font-mono">{error.digest}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
