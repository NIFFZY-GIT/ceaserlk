// src/app/components/CartDrawer.tsx

"use client";

import { useCart } from "@/context/CartContext";
import { X, Trash2, Plus, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// A small, reusable component for the quantity buttons
const QuantitySelector = ({ quantity }: { quantity: number }) => (
  <div className="flex items-center border border-gray-200 rounded-md">
    <button className="p-1.5 text-gray-500 hover:bg-gray-100">
      <Minus size={16} />
    </button>
    <span className="px-3 font-semibold text-black">{quantity}</span>
    <button className="p-1.5 text-gray-500 hover:bg-gray-100">
      <Plus size={16} />
    </button>
  </div>
);


export const CartDrawer = () => {
  const { isCartOpen, closeCart, cartItems, cartCount } = useCart();

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <>
      {/* 
        Main container with transition for the slide-in effect.
        High z-index (z-50) ensures it's on top of everything.
      */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-brand-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-black uppercase tracking-wider">Cart</h2>
            <button onClick={closeCart} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          {cartItems.length > 0 ? (
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className="w-24 h-24 relative bg-gray-100 rounded-lg shrink-0">
                    <Image src={item.imageUrl} alt={item.name} fill style={{objectFit:'cover'}} className="rounded-lg" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-lg text-black">{item.name}</p>
                    <p className="font-bold text-lg text-primary mt-1">${item.price.toFixed(2)}</p>
                    <div className="flex justify-between items-center mt-3">
                      <QuantitySelector quantity={item.quantity} />
                      <button className="text-gray-400 hover:text-accent transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                <h3 className="text-xl font-semibold text-black">Your cart is empty</h3>
                <p className="text-gray-500 mt-2 max-w-xs">Fill it with ambition. Browse our collection to find your next statement piece.</p>
                <Link href="/shop" onClick={closeCart} className="mt-6 bg-primary text-white font-bold px-8 py-3 rounded-md hover:bg-opacity-90 transition-colors">
                    Start Shopping
                </Link>
            </div>
          )}

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-black">Subtotal</span>
                <span className="text-2xl font-bold text-primary">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 text-center mb-4">Shipping & taxes calculated at checkout.</p>
              <Link 
                href="/checkout" 
                onClick={closeCart}
                className="block w-full text-center bg-accent text-white py-4 rounded-md font-bold uppercase tracking-wider hover:bg-red-500 transition-colors duration-300"
              >
                Proceed to Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* 
        Backdrop with blur and dark overlay effect.
        Lower z-index (z-40) than the cart but higher than the navbar.
        pointer-events-none when hidden is crucial for accessibility.
      */}
      <div 
        onClick={closeCart} 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
    </>
  );
};