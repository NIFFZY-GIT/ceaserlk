// src/app/components/CartDrawer.tsx

"use client";

import { useCart, CartItem } from "@/context/CartContext";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';

const FREE_SHIPPING_THRESHOLD = 100;

// --- Sub-components for a cleaner main component ---

const FreeShippingMeter = ({ subtotal }: { subtotal: number }) => {
  const percentage = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="px-8 mb-6">
      {percentage < 100 ? (
        <p className="text-center text-sm text-gray-400 mb-2">
          Add <span className="font-bold text-primary">${remaining.toFixed(2)}</span> for free shipping!
        </p>
      ) : (
        <p className="text-center text-sm font-bold text-primary mb-2">
          You&apos;ve unlocked free shipping!
        </p>
      )}
      <div className="relative h-2 w-full rounded-full bg-gray-800">
        <div 
          className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const CartItemCard = ({ item }: { item: CartItem }) => {
  const { removeFromCart, updateQuantity } = useCart();
  
  return (
    <div className="flex items-center space-x-6 cart-item-gsap">
      <Link href={`/shop/${item.productId}`} className="w-28 h-28 relative bg-gray-900 rounded-lg shrink-0 overflow-hidden group">
        <Image 
          src={item.imageUrl} 
          alt={item.name} 
          fill 
          style={{objectFit:'cover'}}
          className="transition-transform duration-300 group-hover:scale-110"
        />
      </Link>
      <div className="flex-grow">
        <p className="font-bold text-lg text-white">{item.name}</p>
        <p className="font-semibold text-base text-primary mt-1">${item.price.toFixed(2)}</p>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-4">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"><Minus size={16} /></button>
            <span className="w-4 text-center font-semibold">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"><Plus size={16} /></button>
          </div>
          <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-accent transition-colors p-1"><Trash2 size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export const CartDrawer = () => {
  const { isCartOpen, closeCart, cartItems, cartCount } = useCart();
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const drawerRef = useRef(null);

  useLayoutEffect(() => {
    if (!isCartOpen) return;
    
    // Use a GSAP timeline for a choreographed animation sequence
    const tl = gsap.timeline();
    const ctx = gsap.context(() => {
      tl.from(".cart-header-gsap", { y: -50, opacity: 0, duration: 0.4, ease: 'power2.out' })
        .from(".cart-item-gsap", {
          opacity: 0,
          x: 100,
          stagger: 0.1,
          duration: 0.5,
          ease: 'power3.out'
        }, "-=0.2") // Overlap start of item animation with end of header animation
        .from(".cart-footer-gsap", { y: 50, opacity: 0, duration: 0.4, ease: 'power2.out' }, "-=0.3");
    }, drawerRef);
    
    return () => ctx.revert();
  }, [isCartOpen, cartItems.length]);

  return (
    <>
      <div 
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-brand-black shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full text-white">
          {/* Header */}
          <div className="flex justify-between items-center p-8 border-b border-gray-800 cart-header-gsap">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-primary" size={28}/>
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                Cart <span className="text-gray-500 font-normal">({cartCount})</span>
              </h2>
            </div>
            <button onClick={closeCart} className="p-2 rounded-full text-gray-500 hover:bg-gray-800 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          {cartItems.length > 0 ? (
            <div className="flex-grow overflow-y-auto p-8 space-y-8">
              {cartItems.map(item => <CartItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                <ShoppingBag size={80} className="text-gray-800 mb-6" />
                <h3 className="text-2xl font-semibold">Your Cart is a Blank Canvas</h3>
                <p className="text-gray-500 mt-2 max-w-xs">The greatest creations start with a single piece. Find yours in our collection.</p>
                <Link href="/shop" onClick={closeCart} className="mt-8 bg-primary text-white font-bold px-8 py-3 rounded-md hover:bg-opacity-90 transition-colors">
                    Explore The Collection
                </Link>
            </div>
          )}

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="p-8 border-t border-gray-800 bg-brand-black cart-footer-gsap">
              <FreeShippingMeter subtotal={subtotal} />
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-300">Subtotal</span>
                <span className="text-2xl font-bold text-white">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">Shipping & taxes are calculated at checkout.</p>
              <Link href="/checkout" onClick={closeCart} className="block w-full text-center bg-accent text-white py-4 rounded-md font-bold uppercase tracking-wider transition-all duration-300 hover:bg-red-500 hover:shadow-lg hover:shadow-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/50">
                Proceed to Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Backdrop */}
      <div 
        onClick={closeCart} 
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-40 transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
    </>
  );
};