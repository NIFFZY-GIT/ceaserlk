"use client";

import { X } from 'lucide-react';

// Define the shape of the filters object that will be passed around
export interface Filters {
  maxPrice: number;
  sizes: string[];
  colors: string[];
}

// Define the shape of the props this component will receive
interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onFilterChange: (filterType: keyof Filters, value: string | number) => void;
  availableSizes: string[];
  availableColors: { name: string; hex: string }[];
  clearFilters: () => void;
  minPrice: number;
  maxPrice: number;
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
}) => {
  // Helper function to handle toggling array filters (sizes, colors)
  const handleToggle = (filterType: 'sizes' | 'colors', value: string) => {
    onFilterChange(filterType, value);
  };

  // Calculate active filter count
  const activeFilterCount = filters.sizes.length + filters.colors.length + (filters.maxPrice < maxPrice ? 1 : 0);

  const FilterContent = () => (
    <>
      {/* Category Filter (static for now) */}
      <div className="mb-8 space-y-4">
        <h3 className="font-semibold text-gray-800">Category</h3>
        <ul className="space-y-2 text-gray-600">
          <li><a href="#" className="hover:text-primary">All Apparel</a></li>
          <li><a href="#" className="hover:text-primary">New Arrivals</a></li>
          <li><a href="#" className="hover:text-primary">On Sale</a></li>
        </ul>
      </div>

      {/* Price Filter */}
      <div className="mb-8">
        <h3 className="mb-4 font-semibold text-gray-800">Price Range</h3>
        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
          <span>LKR {minPrice}</span>
          <span className="px-2 py-1 font-bold text-black bg-gray-100 rounded">Up to LKR {filters.maxPrice}</span>
          <span className="text-gray-400">LKR {maxPrice}</span>
        </div>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={filters.maxPrice}
          onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary slider"
        />
        <div className="mt-2 text-xs text-gray-500">
          Drag to set maximum price
        </div>
      </div>

      {/* Size Filter */}
      <div className="mb-8">
        <h3 className="mb-4 font-semibold text-gray-800">
          Size 
          {filters.sizes.length > 0 && (
            <span className="px-2 py-1 ml-2 text-xs text-primary bg-green-100 rounded-full">
              {filters.sizes.length} selected
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map(size => (
            <button
              key={size}
              onClick={() => handleToggle('sizes', size)}
              className={`w-12 h-12 border rounded-md flex items-center justify-center text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                filters.sizes.includes(size)
                  ? 'bg-brand-black text-brand-white border-brand-black shadow-lg'
                  : 'border-gray-300 hover:border-brand-black hover:bg-gray-50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        {filters.sizes.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            Selected: {filters.sizes.join(', ')}
          </div>
        )}
      </div>

      {/* Color Filter */}
      <div>
        <h3 className="mb-4 font-semibold text-gray-800">
          Color
          {filters.colors.length > 0 && (
            <span className="px-2 py-1 ml-2 text-xs text-primary bg-green-100 rounded-full">
              {filters.colors.length} selected
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-3">
          {availableColors.map(color => (
            <div key={color.name} className="flex flex-col items-center">
              <button
                title={color.name}
                onClick={() => handleToggle('colors', color.name)}
                className={`w-10 h-10 rounded-full border transition-all duration-200 transform hover:scale-110 ${
                  filters.colors.includes(color.name)
                    ? 'ring-2 ring-offset-2 ring-primary shadow-lg'
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {filters.colors.includes(color.name) && (
                  <div className="flex items-center justify-center w-full h-full rounded-full">
                    <svg className="w-4 h-4 text-brand-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
              <span className="mt-1 text-xs text-gray-600 capitalize">{color.name}</span>
            </div>
          ))}
        </div>
        {filters.colors.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            Selected: {filters.colors.join(', ')}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:col-span-1">
        <div className="sticky top-28">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-black">
              Filters
              {activeFilterCount > 0 && (
                <span className="px-2 py-1 text-xs text-white rounded-full bg-primary">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            <button 
              onClick={clearFilters} 
              className={`text-sm transition-colors hover:underline ${
                activeFilterCount > 0 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-gray-500 hover:text-primary'
              }`}
              disabled={activeFilterCount === 0}
            >
              Clear All
            </button>
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto modern-scrollbar pr-2 scroll-smooth">
            <FilterContent />
          </div>
        </div>
      </aside>

      {/* Mobile Filter Overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 left-0 h-full w-4/5 max-w-sm bg-white z-50 transform transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full p-6 overflow-y-auto modern-scrollbar scroll-smooth">
          <div className="flex items-center justify-between mb-8">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              Filters
              {activeFilterCount > 0 && (
                <span className="px-2 py-1 text-xs text-white rounded-full bg-primary">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
              <X size={24} />
            </button>
          </div>
          <FilterContent />
          <div className="flex flex-col gap-4 pt-6 mt-8 border-t">
              <button 
                onClick={clearFilters} 
                className={`w-full py-3 text-sm font-semibold border rounded-md transition-colors ${
                  activeFilterCount > 0
                    ? 'border-red-300 text-red-600 hover:bg-red-50'
                    : 'border-gray-300 text-gray-400'
                }`}
                disabled={activeFilterCount === 0}
              >
                Clear All Filters
              </button>
              <button 
                onClick={onClose} 
                className="w-full py-3 text-sm font-semibold text-white transition-colors rounded-md bg-primary hover:bg-primary/90"
              >
                Apply Filters ({activeFilterCount})
              </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;