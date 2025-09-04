// src/app/components/landing/FeaturedProducts.tsx
import Image from 'next/image';
import Link from 'next/link';

// This data will eventually come from your PostgreSQL database
const products = [
  { id: 1, name: 'Conquer Tee', price: '$29.99', imageUrl: '/shirt-1.png' },
  { id: 2, name: 'Unleash Tee', price: '$29.99', imageUrl: '/shirt-2.png' },
  { id: 3, name: 'Grind Tee', price: '$29.99', imageUrl: '/shirt-3.png' },
  { id: 4, name: 'Hustle Tee', price: '$29.99', imageUrl: '/shirt-4.png' },
];

const FeaturedProducts = () => {
  return (
    <section className="bg-brand-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black">Our Latest Drops</h2>
          <p className="text-gray-600 mt-2">Designs forged in the spirit of ambition.</p>
          <div className="mt-4 mx-auto w-24 h-1 bg-primary rounded"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <div key={product.id} className="group flex flex-col">
              <Link href={`/product/${product.id}`} className="block relative h-96 w-full bg-gray-100 rounded-md overflow-hidden">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  style={{objectFit: 'cover'}}
                  className="group-hover:scale-105 transition-transform duration-500"
                />
              </Link>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-black">{product.name}</h3>
                <p className="mt-1 text-primary font-bold text-xl">{product.price}</p>
              </div>
              <div className="mt-4">
                 <button className="w-full bg-black text-white py-3 rounded-md font-semibold hover:bg-gray-800 transition-colors">
                    Add to Cart
                 </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/shop" className="bg-accent text-white font-bold text-lg px-12 py-4 rounded-md uppercase tracking-wider hover:bg-red-500 transition-colors">
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;