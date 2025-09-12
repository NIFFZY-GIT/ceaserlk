"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/app/components/ProductCard';
import { Search, Loader2 } from 'lucide-react';

// Product type matching the API response and ProductCard expectations
type ProductColor = {
  color_id: number;
  name: string;
  hex_code: string;
};

type ProductImage = {
  image_id: number;
  url: string;
  color_id: number | null;
};

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice?: number | null;
  audioUrl?: string | null;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: string[];
  stock: { [size: string]: number };
};

interface SearchResults {
  products: Product[];
  totalResults: number;
  query: string;
}

const SearchPage = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(query);

  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        console.error('Search failed');
        setResults({ products: [], totalResults: 0, query: searchQuery });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ products: [], totalResults: 0, query: searchQuery });
    } finally {
      setLoading(false);
    }
  };

  // Search when query parameter changes
  useEffect(() => {
    if (query) {
      setSearchTerm(query);
      performSearch(query);
    }
  }, [query]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Update URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.set('q', searchTerm.trim());
      window.history.pushState({}, '', url.toString());
      
      performSearch(searchTerm);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container px-4 py-8 mx-auto sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-wider text-black uppercase md:text-5xl">
            Search Products
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Find the perfect gear for your journey
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-l-lg focus:border-primary focus:outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || searchTerm.trim().length < 2}
                className="px-8 py-4 bg-primary text-white font-bold rounded-r-lg hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Search Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-gray-600">Searching products...</p>
            </div>
          </div>
        )}

        {results && !loading && (
          <div className="space-y-8">
            {/* Results Summary */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {results.totalResults > 0 
                  ? `Found ${results.totalResults} result${results.totalResults !== 1 ? 's' : ''}`
                  : 'No products found'
                }
              </h2>
              {results.query && (
                <p className="text-gray-600">
                  {results.totalResults > 0 ? 'for' : 'matching'} &ldquo;{results.query}&rdquo;
                </p>
              )}
            </div>

            {/* Products Grid */}
            {results.products.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              results.query && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-6">
                    We couldn&apos;t find any products matching &ldquo;{results.query}&rdquo;.
                  </p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>Try:</p>
                    <ul className="space-y-1">
                      <li>• Using different keywords</li>
                      <li>• Checking your spelling</li>
                      <li>• Using more general terms</li>
                      <li>• Browsing our categories instead</li>
                    </ul>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Default State */}
        {!results && !loading && !query && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start your search</h3>
            <p className="text-gray-600">
              Enter a product name, description, or keyword above to find what you&apos;re looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;