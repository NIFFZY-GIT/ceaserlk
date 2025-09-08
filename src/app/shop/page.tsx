// src/app/shop/page.tsx

"use client";

import { useState } from 'react';
import { ProductCard } from '@/app/components/ProductCard';
import FilterSidebar from '@/app/components/FilterSidebar';
import { SlidersHorizontal } from 'lucide-react';

// MOCK DATA (same as before)
const allProducts = [
    {id:1,name:"Conquer Tee",price:35,salePrice:29.99,images:[{id:1,url:"/images/image1.jpg"},{id:2,url:"/images/image2.jpg"}],colors:[{name:"Black",hex:"#000000"},{name:"White",hex:"#FFFFFF",ringColor:"ring-gray-400"}],sizes:["S","M","L","XL"],availableSizes:["S","M","XL"]},{id:2,name:"Unleash Tee",price:29.99,salePrice:null,images:[{id:3,url:"/images/image1.jpg"},{id:4,url:"/images/image2.jpg"}],colors:[{name:"Forest Green",hex:"#107D3F"},{name:"Black",hex:"#000000"}],sizes:["S","M","L","XL"],availableSizes:["S","M","L","XL"]},{id:3,name:"Grind Tee",price:39.99,salePrice:29.99,images:[{id:5,url:"/images/image1.jpg"},{id:6,url:"/images/image2.jpg"}],colors:[{name:"Crimson Red",hex:"#EF3D4C"},{name:"White",hex:"#FFFFFF",ringColor:"ring-gray-400"}],sizes:["S","M","L","XL"],availableSizes:["M"]},{id:4,name:"Hustle Tee",price:29.99,salePrice:null,images:[{id:7,url:"/images/image1.jpg"},{id:8,url:"/images/image2.jpg"}],colors:[{name:"Black",hex:"#000000"},{name:"Forest Green",hex:"#107D3F"}],sizes:["S","M","L","XL"],availableSizes:["L","XL"]},
];

const ShopPage = () => {
  // State for the mobile filter overlay
  const [isMobileFilterOpen, setMobileFilterOpen] = useState(false);
  
  // NEW: State for the desktop sidebar visibility. Default to true.
  const [isDesktopFilterVisible, setDesktopFilterVisible] = useState(true);

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-black uppercase tracking-wider">
            The Collection
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Apparel designed for the relentless.
          </p>
        </div>
        
        {/* Main Content Area with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-12">
          {/* 
            ====================================================================
              CHANGE 1: Conditionally render the sidebar wrapper.
              It now takes 1 column on desktop ONLY IF isDesktopFilterVisible is true.
            ====================================================================
          */}
          <div className={isDesktopFilterVisible ? 'lg:col-span-1' : 'hidden'}>
            <FilterSidebar 
              isOpen={isMobileFilterOpen} 
              onClose={() => setMobileFilterOpen(false)} 
            />
          </div>

          {/* 
            ====================================================================
              CHANGE 2: Adjust the main content's column span.
              It takes 3 columns when the sidebar is visible, and expands to 4 when hidden.
            ====================================================================
          */}
          <main className={`transition-all duration-300 ${isDesktopFilterVisible ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            {/* Toolbar: Product Count, Sort, and Filter Toggles */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                {/* NEW: Desktop Filter Toggle Button */}
                <button 
                  onClick={() => setDesktopFilterVisible(!isDesktopFilterVisible)}
                  className="hidden lg:flex items-center gap-2 text-sm font-medium p-2 border rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filters</span>
                </button>
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-black">{allProducts.length}</span> products
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
    
              </div>
            </div>

            {/* The actual grid of products */}
            <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 transition-all duration-300 ${isDesktopFilterVisible ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;