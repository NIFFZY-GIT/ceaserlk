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
        <h3 className="mb-5 text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">Price Range</h3>
        
        {/* Selected Price Display */}
        <div className="mb-5 p-4 bg-[#f8f8f8] border border-[#e5e5e5]">
          <div className="text-[10px] font-medium tracking-wider uppercase text-[#888] mb-1">
            Budget
          </div>
          <div className="text-lg font-semibold text-[#1a1a1a]">
            Up to <span className="text-[#2a2a2a]">LKR {filters.maxPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="px-1">
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={filters.maxPrice}
            onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
            className="w-full h-2 bg-[#e5e5e5] rounded-full appearance-none cursor-pointer accent-[#1a1a1a] 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
              [&::-webkit-slider-thumb]:bg-[#1a1a1a] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#1a1a1a] 
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Min/Max Labels */}
        <div className="flex items-center justify-between mt-3 text-[11px] text-[#888]">
          <span>LKR {minPrice.toLocaleString()}</span>
          <span>LKR {maxPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Size Filter */}
      <div className="mb-8 pb-6 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">Size</h3>
          {filters.sizes.length > 0 && (
            <span className="text-[10px] font-medium text-white bg-[#1a1a1a] px-2.5 py-1 rounded-full">
              {filters.sizes.length} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {availableSizes.map(size => (
            <button
              key={size}
              onClick={() => handleToggle('sizes', size)}
              className={`min-w-[44px] h-11 px-3 border-2 flex items-center justify-center text-sm font-medium transition-all duration-200 rounded ${
                filters.sizes.includes(size)
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-md'
                  : 'border-[#e0e0e0] text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#fafafa]'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">Color</h3>
          {filters.colors.length > 0 && (
            <span className="text-[10px] font-medium text-white bg-[#1a1a1a] px-2.5 py-1 rounded-full">
              {filters.colors.length} selected
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-3">
          {uniqueColors.map(color => (
            <div key={color.name} className="flex flex-col items-center gap-1.5">
              <button
                title={color.name}
                onClick={() => handleToggle('colors', color.name)}
                className={`relative w-9 h-9 rounded-full border-2 transition-all duration-200 shadow-sm ${
                  filters.colors.includes(color.name)
                    ? 'border-[#1a1a1a] ring-2 ring-[#1a1a1a] ring-offset-2 scale-110'
                    : 'border-white hover:scale-105 hover:shadow-md'
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
              <span className="text-[9px] text-[#666] text-center truncate w-full capitalize">
                {color.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${showDesktop ? 'hidden lg:block lg:col-span-1 lg:self-start lg:sticky lg:top-24' : 'hidden'}`}>
        <div>
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
            <div>
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