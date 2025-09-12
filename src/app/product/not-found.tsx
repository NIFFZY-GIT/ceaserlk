"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Search, ArrowLeft } from 'lucide-react';

export default function ProductNotFound() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-white">
      <div className="max-w-lg mx-auto text-center">
        {/* Product Icon */}
        <div className="mb-8">
          <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Product Not Found
          </h1>
          <p className="mb-2 text-lg text-gray-600">
            The product you&apos;re looking for doesn&apos;t exist or is no longer available.
          </p>
          <p className="text-gray-500">
            It might have been discontinued or the link is outdated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 mb-8 sm:flex-row">
          <Link 
            href="/shop"
            className="flex items-center gap-2 px-6 py-3 font-semibold text-white transition-colors duration-300 rounded-lg bg-primary hover:bg-primary/90"
          >
            <Search size={20} />
            Browse Products
          </Link>
          
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 font-semibold text-gray-700 transition-colors duration-300 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        {/* Suggestions */}
        <div className="p-6 text-left rounded-lg bg-gray-50">
          <h3 className="mb-3 font-semibold text-gray-900">What you can do:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Browse our <Link href="/shop" className="text-primary hover:underline">latest collection</Link></span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Use the search to find similar products</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Check out our <Link href="/" className="text-primary hover:underline">featured items</Link></span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span><Link href="/contact" className="text-primary hover:underline">Contact us</Link> if you need help finding something specific</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
