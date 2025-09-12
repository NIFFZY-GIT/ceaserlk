"use client";

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from '@/app/components/ProductCard';
import FilterSidebar, { Filters } from '@/app/components/FilterSidebar';
import { SlidersHorizontal, Loader2 } from 'lucide-react';

// Define the full Product type for type safety
type ProductColor = { color_id: number; name: string; hex_code: string; };
type ProductImage = { image_id: number; url: string; color_id: number | null; };
type ProductSize = { name: string; stock: number; };
type Product = {
  id: number; name: string; price: number; salePrice?: number | null;
  images: ProductImage[]; colors: ProductColor[]; sizes: ProductSize[];
  stock: { [sizeName: string]: number };
};

const INITIAL_FILTERS: Filters = {
  maxPrice: 0, // Will be set dynamically
  sizes: [],
  colors: [],
};

const ShopPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [priceRange, setPriceRange] = useState({ minPrice: 0, maxPrice: 0 });

  // UI State
  const [isMobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isDesktopFilterVisible, setDesktopFilterVisible] = useState(true);

  // Fetch price range on initial load
  useEffect(() => {
    const fetchPriceRange = async () => {
      try {
        const res = await fetch('/api/products/price-range');
        const data = await res.json();
        setPriceRange(data);
        // Set initial max price to the maximum available price
        setFilters(prev => ({ ...prev, maxPrice: data.maxPrice }));
      } catch (error) {
        console.error("Failed to fetch price range:", error);
      }
    };
    fetchPriceRange();
  }, []);

  // Fetch all products on initial load
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setAllProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Memoize the calculation of available filter options
  const { availableSizes, availableColors } = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Map<string, { name: string; hex: string }>();
    allProducts.forEach(product => {
      product.sizes.forEach(size => sizes.add(size.name));
      product.colors.forEach(color => {
        if (!colors.has(color.name)) {
          colors.set(color.name, { name: color.name, hex: color.hex_code });
        }
      });
    });
    return {
      availableSizes: Array.from(sizes).map(name => ({ name, stock: 0 })), // Convert to expected format
      availableColors: Array.from(colors.values()),
    };
  }, [allProducts]);

  // The core filtering logic, memoized for performance
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const productPrice = product.salePrice ?? product.price;

      // Price filter
      if (productPrice > filters.maxPrice) {
        return false;
      }

      // Size filter: show if no sizes selected OR if the product has at least one of the selected sizes
      if (filters.sizes.length > 0) {
        const productHasSize = product.sizes.some(size => filters.sizes.includes(size.name));
        if (!productHasSize) return false;
      }
      
      // Color filter: show if no colors selected OR if the product has at least one of the selected colors
      if (filters.colors.length > 0) {
        const productHasColor = product.colors.some(color => filters.colors.includes(color.name));
        if (!productHasColor) return false;
      }

      return true; // If all checks pass, include the product
    });
  }, [allProducts, filters]);

  // Handler function to update filters, passed down to the sidebar
  const handleFilterChange = (filterType: keyof Filters, value: string | number) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters };
      
      if (filterType === 'sizes' || filterType === 'colors') {
        const filterArray = newFilters[filterType] as string[];
        const valueStr = String(value);
        if (filterArray.includes(valueStr)) {
          // If value exists, remove it
          newFilters[filterType] = filterArray.filter(item => item !== valueStr);
        } else {
          // If value doesn't exist, add it
          newFilters[filterType] = [...filterArray, valueStr];
        }
      } else {
        // For simple values like price
        newFilters[filterType] = value as number;
      }
      
      return newFilters;
    });
  };
  
  const clearFilters = () => {
    setFilters({
      maxPrice: priceRange.maxPrice,
      sizes: [],
      colors: [],
    });
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
          )}

          <main className={`transition-all duration-300 ${isDesktopFilterVisible ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            <div className="flex items-center justify-between pb-4 mb-8 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button onClick={() => setDesktopFilterVisible(!isDesktopFilterVisible)} className="items-center hidden gap-2 p-2 text-sm font-medium transition-colors border rounded-md lg:flex hover:bg-gray-100">
                  <SlidersHorizontal size={16} /><span>Filters</span>
                </button>
                <p className="text-sm text-gray-600">Showing <span className="font-semibold text-black">{filteredProducts.length}</span> products</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-96">
                <h3 className="text-2xl font-semibold text-gray-800">No Products Found</h3>
                <p className="mt-2 text-gray-500">Try adjusting your filters to see more results.</p>
                <button onClick={clearFilters} className="px-5 py-2 mt-6 text-sm font-semibold text-white rounded-md bg-primary hover:bg-primary/90">
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 transition-all duration-300 ${isDesktopFilterVisible ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                {filteredProducts.map((product) => (
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