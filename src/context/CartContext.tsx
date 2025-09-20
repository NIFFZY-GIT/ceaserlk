"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS FOR THE FULLY-FETCHED CART ---
export interface VariantImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

export interface CartItem {
  id: string; // cart_item id
  quantity: number;
  sku: {
    id: string;
    size: string;
    variant: {
      price: string;
      thumbnail_url: string | null;
      color_name: string;
      variant_images: VariantImage[];
      product: {
        id: string;
        name: string;
        shipping_cost: string;
      };
    };
  };
}

export interface Cart {
  id: string | null;
  expiresAt: string | null;
  items: CartItem[];
  subtotal: number;
  totalShipping: number;
  totalAmount: number;
}

interface CartContextType {
  cart: Cart | null;
  isCartOpen: boolean;
  cartCount: number;
  loading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  clearError: () => void;
  fetchCart: () => Promise<void>;
  addToCart: (skuId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (cartItemId: string) => Promise<boolean>;
  updateQuantity: (cartItemId: string, newQuantity: number) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router; // Keep ref current
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Helper function to handle authentication errors
  const handleAuthError = useCallback((error: { status: number }, action: string) => {
    if (error.status === 401) {
      setError(`Please log in to ${action}`);
      // Redirect to login page with return URL
      const currentPath = window.location.pathname;
      routerRef.current.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return true;
    }
    return false;
  }, []); // No dependencies needed with ref

  const fetchCart = useCallback(async () => {
    // Don't fetch cart if user is not authenticated
    if (!user) {
      setCart(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const sessionId = getSessionId();
    if (!sessionId) { 
      setLoading(false); 
      return; 
    }
    
    try {
      const res = await fetch(`/api/cart?sessionId=${sessionId}`);
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError({ status: 401 }, 'view cart');
          return;
        }
        throw new Error("Failed to fetch cart");
      }
      const data: Cart = await res.json();
      setCart(data);
    } catch (error) {
      console.error("Cart fetch error:", error);
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [user, handleAuthError]);

  // Separate effect for initial load and user changes
  const lastUserIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    // Prevent unnecessary fetches if user ID hasn't changed
    if (lastUserIdRef.current === (user?.userId || null)) {
      return;
    }
    lastUserIdRef.current = user?.userId || null;
    
    const loadCart = async () => {
      const currentUser = user; // Capture user at the time of effect
      
      if (!currentUser) {
        if (isMounted) {
          setCart(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      
      const sessionId = getSessionId();
      if (!sessionId) { 
        if (isMounted) setLoading(false); 
        return; 
      }
      
      try {
        const res = await fetch(`/api/cart?sessionId=${sessionId}`);
        if (!isMounted) return; // Component unmounted
        
        if (!res.ok) {
          if (res.status === 401) {
            handleAuthError({ status: 401 }, 'view cart');
            return;
          }
          throw new Error("Failed to fetch cart");
        }
        const data: Cart = await res.json();
        if (isMounted) {
          setCart(data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Cart fetch error:", error);
          setError("Failed to load cart");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCart();
    
    return () => {
      isMounted = false;
    };
  }, [user, handleAuthError]); // Include user since we use it

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // --- ENHANCED MUTATION FUNCTIONS WITH STOCK VALIDATION ---
  const addToCart = async (skuId: string, quantity: number): Promise<boolean> => {
    // Check authentication first
    if (!user) {
      handleAuthError({ status: 401 }, 'add items to cart');
      return false;
    }

    setLoading(true);
    setError(null);
    const sessionId = getSessionId();
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId, quantity, sessionId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          handleAuthError({ status: 401 }, 'add items to cart');
          return false;
        }
        if (res.status === 409) {
          setError(errorData.error || "Not enough stock available");
          return false;
        }
        throw new Error(errorData.error || 'Failed to add item to cart');
      }
      
      await fetchCart(); // Re-fetch the cart to get updated state from the server
      return true;
    } catch (error) {
      console.error("Add to cart error:", error);
      setError(error instanceof Error ? error.message : "Failed to add item to cart");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const updateQuantity = async (cartItemId: string, newQuantity: number): Promise<boolean> => {
    // Check authentication first
    if (!user) {
      handleAuthError({ status: 401 }, 'update cart');
      return false;
    }

    setLoading(true);
    setError(null);
    
    // Optimistic update for immediate UI feedback
    setCart(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map(item => 
          item.id === cartItemId 
            ? { ...item, quantity: newQuantity }
            : item
        ).filter(item => item.quantity > 0) // Remove items with 0 quantity
      };
    });
    
    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, newQuantity }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          handleAuthError({ status: 401 }, 'update cart');
          return false;
        }
        if (res.status === 500 && errorData.error?.includes('stock')) {
          setError(errorData.error || "Not enough stock available");
          await fetchCart(); // Revert optimistic update on error
          return false;
        }
        throw new Error(errorData.error || 'Failed to update quantity');
      }
      
      await fetchCart(); // Sync with server
      return true;
    } catch (error) {
      console.error("Update quantity error:", error);
      setError(error instanceof Error ? error.message : "Failed to update quantity");
      await fetchCart(); // Revert optimistic update on error
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId: string): Promise<boolean> => {
    // Check authentication first
    if (!user) {
      handleAuthError({ status: 401 }, 'remove items from cart');
      return false;
    }

    setLoading(true);
    setError(null);
    
    // Optimistic update for immediate UI feedback
    setCart(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.filter(item => item.id !== cartItemId)
      };
    });
    
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          handleAuthError({ status: 401 }, 'remove items from cart');
          return false;
        }
        await fetchCart(); // Revert optimistic update on error
        throw new Error(errorData.error || 'Failed to remove item');
      }
      
      await fetchCart(); // Sync with server
      return true;
    } catch (error) {
      console.error("Remove from cart error:", error);
      setError(error instanceof Error ? error.message : "Failed to remove item");
      await fetchCart(); // Revert optimistic update on error
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Calculate cart count with proper memoization
  const cartCount = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const value = { 
    cart, 
    isCartOpen, 
    cartCount, 
    loading, 
    error,
    openCart, 
    closeCart, 
    clearError,
    fetchCart,
    addToCart, 
    removeFromCart, 
    updateQuantity 
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