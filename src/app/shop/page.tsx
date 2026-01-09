"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/app/components/ProductCard';
import FilterSidebar, { Filters, AvailableColors } from '@/app/components/FilterSidebar';
import { SlidersHorizontal, Loader2, ChevronRight } from 'lucide-react';

// Simplified Product type, as the backend now structures the data perfectly for the card
type ProductVariant = {
  variantId: string;
  price: string;
  compareAtPrice: string | null;
  thumbnailUrl: string;
  colorName: string;
  colorHex: string;
  images: { id: string, url: string }[];
  stock: { id: string; size: string; stock: number }[];
};

type Product = {
  id: string;
  name: string;
  description: string;
  variants: ProductVariant[];
};

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // State for filter options, fetched once
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<AvailableColors[]>([]);
  const [priceRange, setPriceRange] = useState({ minPrice: 0, maxPrice: 100 });

  // State for currently selected filters
  const [filters, setFilters] = useState<Filters>({
    maxPrice: 100, // Initial value, will be updated
    sizes: [],
    colors: [],
  });

  // UI State
  const [isMobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isDesktopFilterVisible, setDesktopFilterVisible] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const previousIsMobileRef = useRef<boolean | null>(null);
  const activeFilterCount = filters.sizes.length + filters.colors.length + (filters.maxPrice < priceRange.maxPrice ? 1 : 0);
  // Combined effect to fetch initial data and products in one go
  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch filter options and price range first
        const [optionsRes, priceRes] = await Promise.all([
          fetch('/api/products/filter-options'),
          fetch('/api/products/price-range'),
        ]);
        
        const optionsData = await optionsRes.json();
        const priceData = await priceRes.json();
        
        if (isMounted) {
          setAvailableSizes(optionsData.availableSizes);
          setAvailableColors(optionsData.availableColors);
          setPriceRange(priceData);
          setFilters(prev => ({ ...prev, maxPrice: priceData.maxPrice }));
          setInitialDataLoaded(true);
          
          // Now fetch products with default filters
          const res = await fetch('/api/products');
          const productsData = await res.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Failed to fetch shop data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Separate effect for filter changes (only after initial load)
  useEffect(() => {
    if (!initialDataLoaded) return;
    
    let isMounted = true;
    
    const fetchFilteredProducts = async () => {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.maxPrice < priceRange.maxPrice) {
        params.append('maxPrice', filters.maxPrice.toString());
      }
      if (filters.sizes.length > 0) {
        params.append('sizes', filters.sizes.join(','));
      }
      if (filters.colors.length > 0) {
        params.append('colors', filters.colors.join(','));
      }
      
      try {
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (isMounted) {
          setProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch filtered products:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchFilteredProducts();
    
    return () => {
      isMounted = false;
    };
  }, [filters, initialDataLoaded, priceRange.maxPrice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResponsiveLayout = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobileView(mobile);

      if (!mobile) {
        setMobileFilterOpen(false);
      }

      if (previousIsMobileRef.current !== null && previousIsMobileRef.current && !mobile) {
        setDesktopFilterVisible(true);
      }

      previousIsMobileRef.current = mobile;
    };

    handleResponsiveLayout();
    window.addEventListener('resize', handleResponsiveLayout);
    return () => window.removeEventListener('resize', handleResponsiveLayout);
  }, []);


  const handleFilterChange = (filterType: keyof Filters, value: string | number) => {
    setFilters(prev => {
        const newFilters = { ...prev };
        if (filterType === 'sizes' || filterType === 'colors') {
            const list = newFilters[filterType] as string[];
            const valStr = String(value);
            newFilters[filterType] = list.includes(valStr) ? list.filter(item => item !== valStr) : [...list, valStr];
        } else {
            newFilters[filterType] = value as number;
        }
        return newFilters;
    });
  };
  
  const clearFilters = () => {
    setFilters({ maxPrice: priceRange.maxPrice, sizes: [], colors: [] });
  };
  
  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Dark Header Section */}
      <div className="bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
            <Link href="/" className="text-white/60 hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-white/40" />
            <span className="text-white font-medium">Shop</span>
          </nav>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-wide">
            The Collection
          </h1>
          <p className="text-white/60 mt-3 text-base sm:text-lg">
            Apparel designed for Your Performance
          </p>
          
          {/* Signature stripe */}
          <div className="flex h-1.5 w-32 mt-8">
            <div className="flex-1 bg-[#006633]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#cc0000]" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-12">
          <FilterSidebar
            showDesktop={isDesktopFilterVisible}
            isOpen={isMobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            filters={filters}
            onFilterChange={handleFilterChange}
            availableSizes={availableSizes}
            availableColors={availableColors}
            clearFilters={clearFilters}
            minPrice={priceRange.minPrice}
            maxPrice={priceRange.maxPrice}
          />
          <section className={`flex flex-col gap-8 transition-all duration-300 ${isDesktopFilterVisible ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-[#e5e5e5] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="inline-flex items-center gap-2 border border-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-[#1a1a1a] transition-all hover:bg-[#1a1a1a] hover:text-white lg:hidden"
                  aria-expanded={isMobileFilterOpen}
                  aria-controls="shop-mobile-filters"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center bg-[#006633] text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setDesktopFilterVisible(v => !v)} 
                  className="hidden items-center gap-2 border border-[#e5e5e5] px-4 py-2.5 text-sm font-medium text-[#1a1a1a] transition-all hover:border-[#1a1a1a] lg:flex"
                >
                  <SlidersHorizontal size={16} />
                  <span>{isDesktopFilterVisible ? 'Hide Filters' : 'Show Filters'}</span>
                </button>
              </div>
              <p className="text-sm text-[#666] sm:text-right" aria-live="polite">
                Showing <span className="font-medium text-[#1a1a1a]">{products.length}</span> products
              </p>
            </div>
            {loading ? (
              <div className="flex min-h-[55vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a1a1a]" />
                  <p className="text-sm text-[#666]">Loading products...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-96 bg-white border border-[#e5e5e5] p-8">
                <h3 className="text-xl font-medium text-[#1a1a1a]">No Products Found</h3>
                <p className="mt-2 text-[#666]">Try adjusting your filters to see more results.</p>
                <button 
                  onClick={clearFilters} 
                  className="mt-6 px-6 py-3 text-sm font-medium text-white bg-[#1a1a1a] hover:bg-black transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 transition-all duration-300 ${isDesktopFilterVisible ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      {/* Floating Mobile Filter Button */}
      {isMobileView && !isMobileFilterOpen && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="inline-flex items-center gap-2 bg-[#1a1a1a] px-6 py-3.5 text-sm font-medium text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Open filters"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center bg-[#006633] text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}
    </main>
  );
};

export default ShopPage;