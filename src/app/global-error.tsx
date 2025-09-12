"use client";

import { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-100 flex items-center justify-center px-4">
          <div className="max-w-2xl mx-auto text-center">
            {/* Error Icon */}
            <div className="mb-8">
              <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-6xl md:text-8xl font-extrabold text-red-500 mb-4">
                ERROR
              </h1>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Critical Application Error
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                The application encountered a critical error and needs to restart.
              </p>
              <p className="text-gray-500">
                Please try refreshing the page or contact support if the issue persists.
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
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                <RefreshCw size={20} />
                Restart Application
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-300"
              >
                <Home size={20} />
                Go to Homepage
              </button>
            </div>

            {/* Support Information */}
            <div className="bg-white rounded-xl shadow-lg p-6 border">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Critical Error Detected
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                This is a system-level error that requires immediate attention. 
                If this error persists, please contact our technical support team.
              </p>
              
              {error.digest && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Error Reference:</span>{' '}
                    <span className="font-mono">{error.digest}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
