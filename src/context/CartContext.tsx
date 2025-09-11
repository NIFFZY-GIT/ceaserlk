"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { setCookie, getCookie } from 'cookies-next';
import { nanoid } from 'nanoid';

// Updated CartItem type for new reservation system
export interface CartItem {
  id: number;
  productId: number;
  colorId: number;
  sizeId: number;
  quantity: number;
  name: string;
  sizeName: string;
  colorName: string;
  imageUrl: string;
  price: number;
}

export interface Cart {
  sessionId: string;
  items: CartItem[];
  expiresAt: string; // ISO string format
}

interface ProductDetails {
  productId: number;
  productSizeId: number; // Size ID
  sizeName: string;
  colorName: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface CartContextType {
  cart: Cart | null;
  cartCount: number;
  isCartOpen: boolean;
  loading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productDetails: ProductDetails, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, newQuantity: number) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');

  // Initialize session ID
  useEffect(() => {
    let existingSessionId = getCookie('cartSessionId') as string;
    if (!existingSessionId) {
      existingSessionId = nanoid();
      setCookie('cartSessionId', existingSessionId, { maxAge: 60 * 60 * 24 * 7 }); // 7 days
    }
    setSessionId(existingSessionId);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/cart?sessionId=${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data: Cart = await res.json();
      setCart(data);
    } catch (error) {
      console.error("Fetch cart error:", error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchCart();
    }
  }, [fetchCart, sessionId]);

  // Helper function to get color ID from product and color name
  const getColorIdFromProduct = async (productId: number, colorName: string): Promise<number | null> => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) return null;
      const product = await res.json();
      const color = product.colors.find((c: { id: number; name: string }) => c.name === colorName);
      return color ? color.id : null;
    } catch {
      return null;
    }
  };

  const addToCart = async (productDetails: ProductDetails, quantity: number) => {
    if (!sessionId) {
      console.error('No session ID available');
      return;
    }

    setLoading(true);
    try {
      // Get color ID from the product details
      const colorId = await getColorIdFromProduct(productDetails.productId, productDetails.colorName);
      const sizeId = productDetails.productSizeId;

      if (!colorId || !sizeId) {
        throw new Error('Invalid color or size selection');
      }

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          productId: productDetails.productId,
          colorId,
          sizeId,
          quantity,
          name: productDetails.name,
          price: productDetails.price,
          colorName: productDetails.colorName,
          sizeName: productDetails.sizeName,
          imageUrl: productDetails.imageUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add item to cart');
      }

      await fetchCart(); // Refresh cart
      setIsCartOpen(true); // Open cart drawer
    } catch (error) {
      console.error('Add to cart error:', error);
      alert(error instanceof Error ? error.message : 'Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cart/items?cartItemId=${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to remove item from cart');
      }

      await fetchCart(); // Refresh cart
    } catch (error) {
      console.error('Remove from cart error:', error);
      alert('Failed to remove item from cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cart/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItemId: itemId,
          quantity: newQuantity,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      await fetchCart(); // Refresh cart
    } catch (error) {
      console.error('Update quantity error:', error);
      alert(error instanceof Error ? error.message : 'Failed to update quantity');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    // Clear session and cart
    const newSessionId = nanoid();
    setCookie('cartSessionId', newSessionId, { maxAge: 60 * 60 * 24 * 7 });
    setSessionId(newSessionId);
    setCart(null);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const cartCount = cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        isCartOpen,
        loading,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
