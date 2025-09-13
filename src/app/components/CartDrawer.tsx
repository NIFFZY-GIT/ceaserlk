"use client";

import { useCart, CartItem } from "@/context/CartContext";
import { X, Trash2, Plus, Minus, ShoppingBag, Loader2, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { gsap } from 'gsap';

// const FREE_SHIPPING_THRESHOLD = 10000;

// --- Sub-components now correctly access nested data ---

// const FreeShippingMeter = ({ subtotal }: { subtotal: number }) => {
//   const percentage = subtotal > 0 ? Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100) : 0;
//   const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
//   return (
//     <div className="px-6 mb-4 md:px-8">
//       {percentage < 100 ? (
//         <p className="mb-2 text-sm text-center text-gray-400">
//           Add <span className="font-bold text-primary">LKR {remaining.toFixed(2)}</span> for free shipping!
//         </p>
//       ) : (
//         <p className="mb-2 text-sm font-bold text-center text-green-400">
//           You&apos;ve unlocked free shipping!
//         </p>
//       )}
//       <div className="relative w-full h-2 bg-gray-800 rounded-full">
//         <div 
//           className="absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full bg-primary" 
//           style={{ width: `${percentage}%` }}
//         />
//       </div>
//     </div>
//   );
// };

// --- THIS IS THE KEY CHANGE ---
const CartItemCard = ({ item }: { item: CartItem }) => {
  const { removeFromCart, updateQuantity } = useCart();

  // Destructure the nested data for clean and safe access
  const product = item.sku.variant.product;
  const variant = item.sku.variant;
  const size = item.sku.size;
  const imageUrl = variant.thumbnail_url || '/images/image.jpg'; // Use a fallback image

  return (
    <div className="flex items-start space-x-4 cart-item-gsap">
      <Link href={`/product/${product.id}`} className="relative flex-shrink-0 overflow-hidden bg-gray-900 rounded-lg w-28 h-28 group">
        <Image src={imageUrl} alt={product.name} fill style={{objectFit:'cover'}} className="transition-transform duration-300 group-hover:scale-110"/>
      </Link>
      <div className="flex-grow">
        <p className="text-lg font-bold leading-tight text-white">{product.name}</p>
        <p className="text-sm text-gray-400">{size} / {variant.color_name}</p>
        <p className="mt-1 text-base font-semibold text-primary">LKR {Number(variant.price).toFixed(2)}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const newQuantity = item.quantity - 1;
                if (newQuantity === 0) {
                  removeFromCart(item.id);
                } else {
                  updateQuantity(item.id, newQuantity);
                }
              }} 
              className="flex items-center justify-center text-gray-400 transition-colors bg-gray-800 rounded-full w-7 h-7 hover:bg-gray-700 disabled:opacity-50" 
              disabled={item.quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span className="w-4 font-semibold text-center">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex items-center justify-center text-gray-400 transition-colors bg-gray-800 rounded-full w-7 h-7 hover:bg-gray-700">
              <Plus size={14} />
            </button>
          </div>
          <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-500 transition-colors hover:text-accent">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CountdownTimer = ({ expiresAt }: { expiresAt: string | null }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const { fetchCart, closeCart } = useCart();

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const difference = expiration - now;

      if (difference > 0) {
        setTimeLeft(Math.ceil(difference / 1000)); // Convert to seconds
        setIsExpired(false);
      } else {
        if (!isExpired && !isClearing) {
          // Cart just expired - trigger automatic cleanup
          setTimeLeft(0);
          setIsExpired(true);
          setIsClearing(true);
          
          // Clear the cart after showing expired state
          setTimeout(async () => {
            await fetchCart(); // This will trigger the backend cleanup and clear the UI
            // Close the cart drawer after clearing
            setTimeout(() => {
              closeCart();
            }, 500); // Small delay to allow UI to update
          }, 2000); // 2 second delay to show "EXPIRED" state
        }
      }
    };

    // Calculate initial time
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, isExpired, isClearing, fetchCart, closeCart]);

  if (!expiresAt) return null;

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isExpired) return "text-red-500";
    if (timeLeft <= 10) return "text-red-400";
    if (timeLeft <= 20) return "text-orange-400";
    return "text-green-400";
  };

  const getTimerStyle = () => {
    if (isExpired) return "animate-pulse";
    if (timeLeft <= 10) return "animate-pulse";
    return "";
  };

  return (
    <div className="mb-4 text-center">
      <div className={`flex items-center justify-center gap-2 mb-1 ${getTimerStyle()}`}>
        <Clock size={14} className={getTimerColor()} />
        <span className={`text-sm font-mono font-bold ${getTimerColor()}`}>
          {isClearing ? "CLEARING..." : isExpired ? "EXPIRED" : formatTime(timeLeft)}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {isClearing ? "Clearing expired cart" : isExpired ? "Cart has expired" : "Cart expires in"}
      </p>
      {timeLeft <= 10 && timeLeft > 0 && (
        <div className="px-3 py-1 mt-2 border rounded-full bg-red-500/10 border-red-500/20">
          <p className="text-xs font-medium text-red-400">
            ⚠️ Cart expires soon!
          </p>
        </div>
      )}
      {isExpired && !isClearing && (
        <div className="px-3 py-1 mt-2 border rounded-full bg-red-500/10 border-red-500/20">
          <p className="text-xs font-medium text-red-400">
            🕒 Cart expired - Items returned to stock
          </p>
        </div>
      )}
      {isClearing && (
        <div className="px-3 py-1 mt-2 border rounded-full bg-blue-500/10 border-blue-500/20">
          <p className="text-xs font-medium text-blue-400">
            🔄 Clearing cart automatically...
          </p>
        </div>
      )}
    </div>
  );
};

export const CartDrawer = () => {
  const { isCartOpen, closeCart, cart, cartCount, loading } = useCart();
  // --- UPDATED SUBTOTAL CALCULATION ---
  const subtotal = cart?.items.reduce((total, item) => total + Number(item.sku.variant.price) * item.quantity, 0) || 0;
  const drawerRef = useRef(null);

  useLayoutEffect(() => {
    // ... (Your existing GSAP animation logic is fine)
  }, [isCartOpen, cart?.items.length]);

  const hasItems = cart && cart.items.length > 0;

  return (
    <>
      <div ref={drawerRef} className={`fixed top-0 right-0 h-full w-full max-w-lg bg-black shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="relative flex flex-col h-full text-white">
          <div className="flex items-center justify-between p-6 border-b border-gray-800 md:p-8 cart-header-gsap">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-primary" size={28}/>
              <h2 className="text-2xl font-bold tracking-wider uppercase">
                Cart 
                <span className="px-2 py-1 ml-2 text-sm font-bold text-black rounded-full bg-primary">
                  {cartCount}
                </span>
              </h2>
            </div>
            <button onClick={closeCart} className="p-2 text-gray-500 transition-colors rounded-full hover:bg-gray-800 hover:text-white">
              <X size={24} />
            </button>
          </div>
          {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm"><Loader2 className="w-10 h-10 animate-spin text-primary"/></div>}
          {hasItems ? (
            <div className="flex-grow p-6 space-y-6 overflow-y-auto md:p-8">
              {cart.items.map(item => <CartItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
              <ShoppingBag size={80} className="mb-6 text-gray-800" />
              <h3 className="text-2xl font-semibold">Your Cart is Empty</h3>
              <p className="max-w-xs mt-2 text-gray-500">
                Looks like you haven&apos;t added anything yet. Let&apos;s change that.
              </p>
              <Link href="/shop" onClick={closeCart} className="px-8 py-3 mt-8 font-bold text-white transition-colors rounded-md bg-primary hover:bg-opacity-90">
                Start Shopping
              </Link>
            </div>
          )}
          {hasItems && (
            <div className="p-6 bg-black border-t border-gray-800 md:p-8 cart-footer-gsap">
              {/* <FreeShippingMeter subtotal={subtotal} /> */}
              <CountdownTimer expiresAt={cart.expiresAt} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'} in cart
                </span>
                <span className="text-lg font-semibold text-gray-300">Subtotal</span>
                <span className="text-2xl font-bold text-white">LKR {subtotal.toFixed(2)}</span>
              </div>
              <p className="mb-4 text-xs text-center text-gray-500">Shipping & taxes calculated at checkout.</p>
              <Link href="/checkout" onClick={closeCart} className="block w-full py-4 font-bold tracking-wider text-center text-white uppercase transition-all duration-300 rounded-md bg-accent hover:bg-red-500 hover:shadow-lg focus:outline-none focus:ring-4 ring-accent/50">
                Proceed to Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
      <div onClick={closeCart} className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
    </>
  );
};