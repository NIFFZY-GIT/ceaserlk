// src/context/CartContext.tsx (Updated)

"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CartDrawer } from "@/app/components/CartDrawer"; // Renamed from CartSidebar for clarity

// Define the shape of a single cart item
export interface CartItem {
  id: number; // Unique ID for the item variant (e.g., specific color/size)
  productId: number; // The base product ID
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  // Add other details like size or color if needed
  // size: string;
  // color: string;
}

// Define the shape of the context value
interface CartContextType {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cartItems: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: number) => void;      // <-- NEW
  updateQuantity: (itemId: number, newQuantity: number) => void; // <-- NEW
}

// Create the context with a default value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Custom hook for easy access to the context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

// Provider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]); // Add mock data here for testing if you want

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const addToCart = (itemToAdd: CartItem) => {
    // Logic to add or update item quantity
    setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === itemToAdd.id);
        if (existingItem) {
            return prevItems.map(item =>
                item.id === itemToAdd.id
                    ? { ...item, quantity: item.quantity + itemToAdd.quantity }
                    : item
            );
        }
        return [...prevItems, itemToAdd];
    });
    openCart();
  };

  // NEW: Function to remove an item completely
  const removeFromCart = (itemId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  // NEW: Function to update the quantity of an item
  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // If quantity is 0 or less, remove the item
      removeFromCart(itemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };


  const value = {
    isCartOpen,
    openCart,
    closeCart,
    cartItems,
    cartCount,
    addToCart,
    removeFromCart, // <-- EXPORT NEW
    updateQuantity, // <-- EXPORT NEW
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
};