'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error boundary captured an error:', error);
  }, [error]);

  return (
    <html>
      <body className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="max-w-lg p-8 text-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <h1 className="text-3xl font-semibold mb-4">Something went wrong</h1>
          <p className="mb-6 text-white/80">
            An unexpected error occurred while loading this page. Our team has been notified and we are working on a fix.
          </p>
          {error.digest && (
            <p className="mb-6 text-xs text-white/50">Reference code: {error.digest}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-2 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-6 py-2 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition"
            >
              Back to home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
