"use client";

import { X } from 'lucide-react';
import { useMemo, useEffect } from 'react';

// Define the shape of the filters object that will be passed around
export interface Filters {
  maxPrice: number;
  sizes: string[];
  colors: string[];
}

// Define the available colors type
export interface AvailableColors {
  name: string;
  hex: string;
}

// Define the shape of the props this component will receive
interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onFilterChange: (filterType: keyof Filters, value: string | number) => void;
  availableSizes: string[];
  availableColors: AvailableColors[];
  clearFilters: () => void;
  minPrice: number;
  maxPrice: number;
  showDesktop: boolean;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  availableSizes,
  availableColors,
  clearFilters,
  minPrice,
  maxPrice,
  showDesktop,
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    document.body.style.overflow = previousOverflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Helper function to handle toggling array filters (sizes, colors)
  const handleToggle = (filterType: 'sizes' | 'colors', value: string) => {
    onFilterChange(filterType, value);
  };

  // Calculate active filter count
  const activeFilterCount = filters.sizes.length + filters.colors.length + (filters.maxPrice < maxPrice ? 1 : 0);

  // Colors are already deduplicated from the API, so use them directly
  const uniqueColors: AvailableColors[] = useMemo(
    () => availableColors.filter((color) => color.name && color.name.trim()),
    [availableColors]
  );

  const FilterContent = () => (
    <>
      {/* Category Filter (static for now) */}
      {/* <div className="mb-8 space-y-4">
        <h3 className="font-semibold text-gray-800">Category</h3>
        <ul className="space-y-2 text-gray-600">
          <li><a href="#" className="hover:text-primary">All Apparel</a></li>
          <li><a href="#" className="hover:text-primary">New Arrivals</a></li>
          <li><a href="#" className="hover:text-primary">On Sale</a></li>
        </ul>
      </div> */}

      {/* Price Filter */}
      <div className="mb-8 pb-6 border-b border-[#e5e5e5]">
        <h3 className="mb-4 text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">Price Range</h3>
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-[#666]">LKR {minPrice}</span>
          <span className="px-3 py-1.5 text-xs font-medium text-[#1a1a1a] bg-[#f5f5f5]">Up to LKR {filters.maxPrice}</span>
          <span className="text-[#999]">LKR {maxPrice}</span>
        </div>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={filters.maxPrice}
          onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
          className="w-full h-1 bg-[#e5e5e5] appearance-none cursor-pointer accent-[#1a1a1a]"
        />
      </div>

      {/* Size Filter */}
      <div className="mb-8 pb-6 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">Size</h3>
          {filters.sizes.length > 0 && (
            <span className="text-[10px] font-medium text-white bg-[#1a1a1a] px-2 py-0.5">
              {filters.sizes.length}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map(size => (
            <button
              key={size}
              onClick={() => handleToggle('sizes', size)}
              className={`w-10 h-10 border flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                filters.sizes.includes(size)
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                  : 'border-[#e5e5e5] text-[#1a1a1a] hover:border-[#1a1a1a]'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">Color</h3>
          {filters.colors.length > 0 && (
            <span className="text-[10px] font-medium text-white bg-[#1a1a1a] px-2 py-0.5">
              {filters.colors.length}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-4">
          {uniqueColors.map(color => (
            <button
              key={color.name}
              title={color.name}
              onClick={() => handleToggle('colors', color.name)}
              className={`relative w-8 h-8 border-2 transition-all duration-200 ${
                filters.colors.includes(color.name)
                  ? 'border-[#1a1a1a] shadow-md'
                  : 'border-transparent hover:border-[#ccc]'
              }`}
              style={{ backgroundColor: color.hex }}
            >
              {filters.colors.includes(color.name) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${showDesktop ? 'hidden lg:block lg:col-span-1' : 'hidden'}`}>
        <div className="sticky top-28">
          <div className="bg-white border border-[#e5e5e5] p-6">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e5e5e5]">
              <h2 className="flex items-center gap-3 text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">
                Filters
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-medium text-white bg-[#1a1a1a]">
                    {activeFilterCount}
                  </span>
                )}
              </h2>
              <button 
                onClick={clearFilters} 
                className={`text-xs transition-colors ${
                  activeFilterCount > 0 
                    ? 'text-[#cc0000] hover:underline' 
                    : 'text-[#999]'
                }`}
                disabled={activeFilterCount === 0}
              >
                Clear
              </button>
            </div>
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto modern-scrollbar scroll-smooth">
              <FilterContent />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Filter Overlay */}
      <div className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div
        id="shop-mobile-filters"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-mobile-filters-title"
        className={`fixed top-0 left-0 h-full w-full max-w-sm bg-white z-50 transform transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'} sm:max-w-md`}
      >
        <div className="flex h-full flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e5e5]">
            <h2 id="shop-mobile-filters-title" className="flex items-center gap-3 text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">
              Filters
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-medium text-white bg-[#1a1a1a]">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            <button onClick={onClose} className="p-1 text-[#1a1a1a] transition hover:opacity-60" aria-label="Close filters">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 modern-scrollbar">
            <FilterContent />
          </div>
          <div className="border-t border-[#e5e5e5] bg-white px-6 py-5">
            <div className="flex gap-3">
              <button
                onClick={clearFilters}
                className={`flex-1 border py-3 text-xs font-medium tracking-wider uppercase transition-colors ${
                  activeFilterCount > 0
                    ? 'border-[#cc0000] text-[#cc0000] hover:bg-red-50'
                    : 'border-[#e5e5e5] text-[#999]'
                }`}
                disabled={activeFilterCount === 0}
              >
                Clear
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-[#1a1a1a] py-3 text-xs font-medium tracking-wider uppercase text-white transition-colors hover:bg-black"
              >
                Apply ({activeFilterCount})
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;