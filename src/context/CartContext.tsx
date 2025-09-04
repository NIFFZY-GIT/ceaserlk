// src/context/CartContext.tsx

"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of an item in the cart
interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

// Define the shape of the context
interface CartContextType {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cartItems: CartItem[];
  cartCount: number;
  // We will add more functions like addToCart, removeFromCart later
}

// Create the context with a default value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Create a provider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // For now, we'll use dummy data for cart items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: 1, name: 'Conquer Tee', price: 29.99, quantity: 1, imageUrl: '/shirt-1.png' },
    { id: 2, name: 'Unleash Tee', price: 29.99, quantity: 2, imageUrl: '/shirt-2.png' },
  ]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ isCartOpen, openCart, closeCart, cartItems, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};