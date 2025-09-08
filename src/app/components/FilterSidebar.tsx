// src/app/components/FilterSidebar.tsx

"use client";

import { useState } from 'react'; // Import useState for managing the price
import { X } from 'lucide-react';

// Mock data for filters
const sizes = ['S', 'M', 'L', 'XL'];
const colors = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF', ringColor: 'ring-gray-400' },
  { name: 'Forest Green', hex: '#107D3F' },
  { name: 'Crimson Red', hex: '#EF3D4C' },
];

// Define constants for the price range
const MIN_PRICE = 0;
const MAX_PRICE = 100;

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ isOpen, onClose }) => {
  // State to hold the current maximum price value from the slider
  const [maxPrice, setMaxPrice] = useState(75);

  return (
    <>
      {/* 
        This is the main sidebar for large screens.
      */}
      <aside className="hidden lg:block lg:col-span-1">
        <div className="sticky top-28">
          <h2 className="text-xl font-bold text-black mb-6">Filters</h2>
          
          {/* Category Filter */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-gray-800">Category</h3>
            <ul className="space-y-2 text-gray-600">
              <li><a href="#" className="hover:text-primary">All Apparel</a></li>
              <li><a href="#" className="hover:text-primary">New Arrivals</a></li>
              <li><a href="#" className="hover:text-primary">On Sale</a></li>
            </ul>
          </div>

          {/* 
            ====================================================================
              NEW: Price Filter Section (Desktop)
            ====================================================================
          */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Price</h3>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>${MIN_PRICE}</span>
              <span className="font-bold text-black">Up to ${maxPrice}</span>
            </div>
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          {/* ==================================================================== */}

          {/* Size Filter */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Size</h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button key={size} className="w-12 h-12 border border-gray-300 rounded-md flex items-center justify-center text-sm font-medium hover:border-black transition">
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Color</h3>
            <div className="flex flex-wrap gap-3">
              {colors.map(color => (
                <button key={color.name} title={color.name} className={`w-8 h-8 rounded-full border ${color.ringColor || ''} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition`} style={{ backgroundColor: color.hex }} />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* 
        This is the mobile filter overlay.
      */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed top-0 left-0 h-full w-4/5 max-w-sm bg-white z-50 transform transition-transform lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 overflow-y-auto h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">Filters</h2>
            <button onClick={onClose} className="p-1">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold">Category</h3>
            <ul className="space-y-2">
              <li><a href="#">All Apparel</a></li>
              <li><a href="#">New Arrivals</a></li>
              <li><a href="#">On Sale</a></li>
            </ul>
          </div>

          {/* 
            ====================================================================
              NEW: Price Filter Section (Mobile) - Identical UI
            ====================================================================
          */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4">Price</h3>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>${MIN_PRICE}</span>
              <span className="font-bold text-black">Up to ${maxPrice}</span>
            </div>
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          {/* ==================================================================== */}

          <div className="mb-8">
            <h3 className="font-semibold mb-4">Size</h3>
            <div className="flex flex-wrap gap-2">{sizes.map(size => (<button key={size} className="w-12 h-12 border rounded-md">{size}</button>))}</div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Color</h3>
            <div className="flex flex-wrap gap-3">{colors.map(color => (<button key={color.name} title={color.name} className={`w-8 h-8 rounded-full border ${color.ringColor || ''}`} style={{ backgroundColor: color.hex }} />))}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;