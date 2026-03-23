"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
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
    // Create new session ID if doesn't exist
    sessionId = crypto.randomUUID();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest, guestId } = useAuth();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router; // Keep ref current
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cartIntentProcessedRef = useRef(false); // Track if cart intent has been processed

  const clearError = () => setError(null);

  // Helper function to handle authentication errors
  const handleAuthError = useCallback((error: { status: number }, action: string) => {
    if (error.status === 401) {
      setError(`Please log in to ${action}`);
      if (!isGuest) {
        // Redirect to login page with return URL
        const currentPath = window.location.pathname;
        routerRef.current.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }
      return true;
    }
    return false;
  }, [isGuest]);

  const fetchCart = useCallback(async () => {
    // Don't fetch cart if user is not authenticated AND not a guest
    if (!user && !isGuest) {
      setCart(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Use guestId if available, otherwise fall back to session storage
    const sessionId = guestId || getSessionId();
    if (!sessionId) { 
      console.warn('No session ID available for cart');
      setLoading(false); 
      return; 
    }
    
    console.log('Fetching cart with sessionId:', sessionId, 'isGuest:', isGuest, 'hasUser:', !!user);
    
    try {
      const res = await fetch(`/api/cart?sessionId=${sessionId}`);
      if (!res.ok) {
        if (res.status === 401) {
          // Only show error/redirect for authenticated users, not guests or anonymous users
          if (user) {
            handleAuthError({ status: 401 }, 'view cart');
          }
          return;
        }
        throw new Error("Failed to fetch cart");
      }
      const data: Cart = await res.json();
      console.log('Cart fetched successfully:', data);
      setCart(data);
    } catch (error) {
      console.error("Cart fetch error:", error);
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, guestId, handleAuthError]);

  // Effect for initial load and user changes - calls the consolidated fetchCart callback
  useEffect(() => {
    fetchCart();
  }, [user, isGuest, guestId, fetchCart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // --- ENHANCED MUTATION FUNCTIONS WITH STOCK VALIDATION ---
  const addToCart = useCallback(async (skuId: string, quantity: number): Promise<boolean> => {
    // Check authentication first - allow both authenticated users and guests
    if (!user && !isGuest) {
      handleAuthError({ status: 401 }, 'add items to cart');
      return false;
    }

    setLoading(true);
    setError(null);
    const sessionId = guestId || getSessionId();
    console.log('Adding to cart with sessionId:', sessionId, 'skuId:', skuId);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId, quantity, sessionId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          // Only show error/redirect for authenticated users, not guests or anonymous users
          if (user) {
            handleAuthError({ status: 401 }, 'add items to cart');
          }
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
  }, [user, isGuest, handleAuthError, guestId, fetchCart]);
  
  const updateQuantity = async (cartItemId: string, newQuantity: number): Promise<boolean> => {
    // Check authentication first - allow both authenticated users and guests
    if (!user && !isGuest) {
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
      const sessionId = guestId || getSessionId();
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, newQuantity, sessionId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          // Only show error/redirect for authenticated users, not guests or anonymous users
          if (user) {
            handleAuthError({ status: 401 }, 'update cart');
          }
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
    // Check authentication first - allow both authenticated users and guests
    if (!user && !isGuest) {
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
      const sessionId = guestId || getSessionId();
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, sessionId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          // Only show error/redirect for authenticated users, not guests or anonymous users
          if (user) {
            handleAuthError({ status: 401 }, 'remove items from cart');
          }
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

  // Effect to process pending cart intent after authentication
  useEffect(() => {
    const processCartIntent = async () => {
      // Only process once, when user/guest is available, cart is loaded, and we haven't processed yet
      if ((user || isGuest) && !loading && cart && !cartIntentProcessedRef.current) {
        try {
          const cartIntent = sessionStorage.getItem('addToCartAfterLogin');
          if (cartIntent) {
            const { skuId, quantity, timestamp } = JSON.parse(cartIntent);
            // Check if intent is not too old (5 minutes)
            const intentAge = Date.now() - timestamp;
            if (intentAge < 5 * 60 * 1000) {
              console.log('Processing pending cart intent:', { skuId, quantity });
              cartIntentProcessedRef.current = true; // Mark as processed
              sessionStorage.removeItem('addToCartAfterLogin');
              // Add item to cart
              const success = await addToCart(skuId, quantity);
              if (success) {
                // Open cart drawer to show the item was added
                setTimeout(() => setIsCartOpen(true), 500);
              }
            } else {
              // Intent expired, remove it
              console.log('Cart intent expired, removing');
              sessionStorage.removeItem('addToCartAfterLogin');
            }
          }
        } catch (error) {
          console.error('Failed to process cart intent:', error);
          sessionStorage.removeItem('addToCartAfterLogin');
        }
      }
    };

    processCartIntent();
  }, [user, isGuest, loading, cart, addToCart]); // Run when auth state changes and cart is ready

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