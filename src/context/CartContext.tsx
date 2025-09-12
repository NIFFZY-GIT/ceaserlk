"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// --- TYPE DEFINITIONS ---
export interface CartItem {
  id: string; // cart_item id
  quantity: number;
  skuId: string;
  size: string;
  price: string;
  compareAtPrice: string | null;
  colorName: string;
  imageUrl: string;
  productId: string;
  name: string;
}

export interface Cart {
  id: string; // cart id
  expiresAt: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  isCartOpen: boolean;
  cartCount: number;
  loading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (skuId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, newQuantity: number) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to get or create a session ID
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    const sessionId = getSessionId();
    try {
      const res = await fetch(`/api/cart?sessionId=${sessionId}`);
      // This is where your error was happening
      if (!res.ok) {
        // Log the server error for better debugging
        console.error("Server responded with an error:", await res.text());
        throw new Error("Failed to fetch cart");
      }
      const data: Cart = await res.json();
      setCart(data);
    } catch (error) {
      console.error("Cart fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // Placeholder functions for cart mutations
  const addToCart = async (skuId: string, quantity: number) => {
    // TODO: Implement POST to /api/cart
    console.log('Adding to cart:', { skuId, quantity });
    await fetchCart(); // Re-fetch cart to show updates
  };
  const removeFromCart = async (cartItemId: string) => {
    // TODO: Implement DELETE to /api/cart
    console.log('Removing from cart:', cartItemId);
    await fetchCart();
  };
  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    // TODO: Implement PUT to /api/cart
    console.log('Updating quantity:', { cartItemId, newQuantity });
    await fetchCart();
  };

  const cartCount = cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;

  const value = {
    cart, isCartOpen, cartCount, loading,
    openCart, closeCart, addToCart, removeFromCart, updateQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};