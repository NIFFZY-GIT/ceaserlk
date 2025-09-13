"use client";

import { useState, useEffect } from 'react';
import { ProductCard } from '@/app/components/ProductCard';
import FilterSidebar, { Filters, AvailableColors } from '@/app/components/FilterSidebar';
import { SlidersHorizontal, Loader2 } from 'lucide-react';

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
    <div className="bg-gray-50">
      <div className="container px-4 py-16 mx-auto sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-wider text-black uppercase md:text-5xl">The Collection</h1>
          <p className="mt-2 text-lg text-gray-600">Apparel designed for the relentless.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-12">
          {isDesktopFilterVisible && (
            <FilterSidebar 
              isOpen={isMobileFilterOpen} onClose={() => setMobileFilterOpen(false)}
              filters={filters} onFilterChange={handleFilterChange}
              availableSizes={availableSizes} availableColors={availableColors}
              clearFilters={clearFilters} minPrice={priceRange.minPrice} maxPrice={priceRange.maxPrice}
            />
          )}
          <main className={`transition-all duration-300 ${isDesktopFilterVisible ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            <div className="flex items-center justify-between pb-4 mb-8 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button onClick={() => setDesktopFilterVisible(v => !v)} className="items-center hidden gap-2 p-2 text-sm font-medium transition-colors border rounded-md lg:flex hover:bg-gray-100">
                  <SlidersHorizontal size={16} /><span>Filters</span>
                </button>
                <p className="text-sm text-gray-600">Showing <span className="font-semibold text-black">{products.length}</span> products</p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-96">
                <h3 className="text-2xl font-semibold text-gray-800">No Products Found</h3>
                <p className="mt-2 text-gray-500">Try adjusting your filters to see more results.</p>
                <button onClick={clearFilters} className="px-5 py-2 mt-6 text-sm font-semibold text-white rounded-md bg-primary hover:bg-primary/90">Clear All Filters</button>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 transition-all duration-300 ${isDesktopFilterVisible ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;