"use client";

import { useCart, CartItem } from "@/context/CartContext";
import { X, Trash2, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { gsap } from 'gsap';

const FREE_SHIPPING_THRESHOLD = 100;

// --- Sub-components (largely the same, but now using new context data) ---

const FreeShippingMeter = ({ subtotal }: { subtotal: number }) => {
  const percentage = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="px-8 mb-4">
      {percentage < 100 ? (
        <p className="mb-2 text-sm text-center text-gray-400">
          Add <span className="font-bold text-primary">LKR {remaining.toFixed(2)}</span> for free shipping!
        </p>
      ) : (
        <p className="mb-2 text-sm font-bold text-center text-primary">
          You&apos;ve unlocked free shipping!
        </p>
      )}
      <div className="relative w-full h-2 bg-gray-800 rounded-full">
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const CartItemCard = ({ item }: { item: CartItem }) => {
  const { removeFromCart, updateQuantity } = useCart();
  
  return (
    <div className="flex items-start space-x-4 cart-item-gsap">
      <Link href={`/product/${item.productId}`} className="relative flex-shrink-0 overflow-hidden bg-gray-900 rounded-lg w-28 h-28 group">
        <Image 
          src={item.imageUrl} 
          alt={item.name} 
          fill 
          style={{objectFit:'cover'}}
          className="transition-transform duration-300 group-hover:scale-110"
        />
      </Link>
      <div className="flex-grow">
        <p className="text-lg font-bold leading-tight text-white">{item.name}</p>
        <p className="text-sm text-gray-400">
            {item.sizeName} / {item.colorName}
        </p>
        <p className="mt-1 text-base font-semibold text-primary">LKR {Number(item.price).toFixed(2)}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex items-center justify-center text-gray-400 transition-colors bg-gray-800 rounded-full w-7 h-7 hover:bg-gray-700"><Minus size={14} /></button>
            <span className="w-4 font-semibold text-center">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex items-center justify-center text-gray-400 transition-colors bg-gray-800 rounded-full w-7 h-7 hover:bg-gray-700"><Plus size={14} /></button>
          </div>
          <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-500 transition-colors hover:text-accent"><Trash2 size={18} /></button>
        </div>
      </div>
    </div>
  );
};

const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expirationTime = new Date(expiresAt).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, expirationTime - now));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = String(Math.floor((timeLeft / 1000 / 60) % 60)).padStart(2, '0');
  const seconds = String(Math.floor((timeLeft / 1000) % 60)).padStart(2, '0');

  if (timeLeft <= 0) {
    return <p className="mb-4 text-sm font-semibold text-center text-red-500">Your cart has expired.</p>;
  }

  return (
    <div className="px-8 mb-4">
      <p className="text-sm font-semibold text-center text-accent">
        Items reserved for: {minutes}:{seconds}
      </p>
    </div>
  );
};


export const CartDrawer = () => {
  const { isCartOpen, closeCart, cart, cartCount, loading } = useCart();
  const subtotal = cart?.items.reduce((total, item) => total + Number(item.price) * item.quantity, 0) || 0;
  const drawerRef = useRef(null);

  useLayoutEffect(() => {
    if (!isCartOpen || !cart?.items.length) return;
    
    const tl = gsap.timeline();
    const ctx = gsap.context(() => {
      tl.from(".cart-header-gsap", { y: -50, opacity: 0, duration: 0.4, ease: 'power2.out' })
        .from(".cart-item-gsap", { opacity: 0, x: 100, stagger: 0.1, duration: 0.5, ease: 'power3.out' }, "-=0.2")
        .from(".cart-footer-gsap", { y: 50, opacity: 0, duration: 0.4, ease: 'power2.out' }, "-=0.3");
    }, drawerRef);
    
    return () => ctx.revert();
  }, [isCartOpen, cart?.items.length]);

  const hasItems = cart && cart.items.length > 0;

  return (
    <>
      <div 
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-black shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="relative flex flex-col h-full text-white">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800 md:p-8 cart-header-gsap">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-primary" size={28}/>
              <h2 className="text-2xl font-bold tracking-wider uppercase">
                Cart <span className="font-normal text-gray-500">({cartCount})</span>
              </h2>
            </div>
            <button onClick={closeCart} className="p-2 text-gray-500 transition-colors rounded-full hover:bg-gray-800 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          {/* Loading Overlay */}
          {loading && (
             <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 animate-spin text-primary"/>
             </div>
          )}

          {/* Cart Content */}
          {hasItems ? (
            <div className="flex-grow p-6 space-y-6 overflow-y-auto md:p-8">
              {cart.items.map(item => <CartItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
                <ShoppingBag size={80} className="mb-6 text-gray-800" />
                <h3 className="text-2xl font-semibold">Your Cart is Empty</h3>
                <p className="max-w-xs mt-2 text-gray-500">Looks like you haven&apos;t added anything yet. Let&apos;s change that.</p>
                <Link href="/shop" onClick={closeCart} className="px-8 py-3 mt-8 font-bold text-white transition-colors rounded-md bg-primary hover:bg-opacity-90">
                    Start Shopping
                </Link>
            </div>
          )}

          {/* Footer */}
          {hasItems && (
            <div className="p-6 bg-black border-t border-gray-800 md:p-8 cart-footer-gsap">
              <FreeShippingMeter subtotal={subtotal} />
              <CountdownTimer expiresAt={cart.expiresAt} />
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-300">Subtotal</span>
                <span className="text-2xl font-bold text-white">LKR {subtotal.toFixed(2)}</span>
              </div>
              <p className="mb-4 text-xs text-center text-gray-500">Shipping & taxes calculated at checkout.</p>
              <Link href="/checkout" onClick={closeCart} className="block w-full py-4 font-bold tracking-wider text-center text-white uppercase transition-all duration-300 rounded-md bg-accent hover:bg-red-500 hover:shadow-lg hover:shadow-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/50">
                Proceed to Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Backdrop */}
      <div 
        onClick={closeCart} 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
    </>
  );
};