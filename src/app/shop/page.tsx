// src/app/shop/page.tsx
import { ProductCard } from '@/app/components/ProductCard'; // Import our new component

// MOCK DATA: Updated to include multiple images and colors for each product
// NEW MOCK DATA STRUCTURE
const allProducts = [
  { 
    id: 1, 
    name: 'Conquer Tee', 
    price: 35.00,
    salePrice: 29.99, // Add a sale price
    images: [{id: 1, url: '/shirt-1-front.png'}, {id: 2, url: '/shirt-1-back.png'}],
    colors: [{ name: 'Black', hex: '#000000' }, { name: 'White', hex: '#FFFFFF', ringColor: 'ring-gray-400' }],
    sizes: ['S', 'M', 'L', 'XL'],
    availableSizes: ['S', 'M', 'XL'] // 'L' is out of stock for this item
  },
  { 
    id: 2, 
    name: 'Unleash Tee', 
    price: 29.99,
    salePrice: null, // This item is not on sale
    images: [{id: 3, url: '/shirt-2-front.png'}, {id: 4, url: '/shirt-2-back.png'}],
    colors: [{ name: 'Forest Green', hex: '#107D3F' }, { name: 'Black', hex: '#000000' }],
    sizes: ['S', 'M', 'L', 'XL'],
    availableSizes: ['S', 'M', 'L', 'XL'] // All sizes available
  },
  { 
    id: 3, 
    name: 'Grind Tee', 
    price: 39.99,
    salePrice: 29.99,
    images: [{id: 5, url: '/shirt-3-front.png'}, {id: 6, url: '/shirt-3-back.png'}],
    colors: [{ name: 'Crimson Red', hex: '#EF3D4C' }, { name: 'White', hex: '#FFFFFF', ringColor: 'ring-gray-400' }],
    sizes: ['S', 'M', 'L', 'XL'],
    availableSizes: ['M'] // Only 'M' is available
  },
  { 
    id: 4, 
    name: 'Hustle Tee', 
    price: 29.99,
    salePrice: null,
    images: [{id: 7, url: '/shirt-4-front.png'}, {id: 8, url: '/shirt-4-back.png'}],
    colors: [{ name: 'Black', hex: '#000000' }, { name: 'Forest Green', hex: '#107D3F' }],
    sizes: ['S', 'M', 'L', 'XL'],
    availableSizes: ['L', 'XL'] // 'S' and 'M' are out of stock
  },
];

const ShopPage = () => {
  return (
    <div className="bg-brand-white">
      <div className="container mx-auto px-6 py-16">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-black uppercase tracking-wider">The Collection</h1>
          <p className="text-gray-600 mt-2">Apparel designed for the relentless.</p>
          <div className="mt-4 mx-auto w-24 h-1 bg-primary rounded"></div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {allProducts.map((product) => (
            // Use the new, interactive ProductCard component here
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopPage;