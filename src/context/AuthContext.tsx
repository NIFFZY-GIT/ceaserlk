"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { registerLogoutCallback, unregisterLogoutCallback, authenticatedFetch } from '@/lib/fetch-interceptor';
import { isCurrentSessionExpired, getSessionTokenFromCookie } from '@/lib/jwt-client';

interface User {
  userId: number;
  email: string;
  firstName: string;
  role: 'ADMIN' | 'USER';
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  guestId: string | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  startGuestMode: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const userRef = useRef<User | null>(null);
  const isGuestRef = useRef(false);

  // Initialize guest ID from localStorage if exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGuestId = localStorage.getItem('guest_id');
      const storedIsGuest = localStorage.getItem('is_guest') === 'true';
      if (storedGuestId && storedIsGuest) {
        setGuestId(storedGuestId);
        setIsGuest(true);
      }
    }
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.user && userData.authenticated) {
          setUser(userData.user);
        } else {
          console.warn('Invalid response format from /api/auth/me');
          setUser(null);
        }
      } else if (response.status === 401) {
        // Token expired or invalid - automatically logout
        console.warn('Session expired during auth check');
        setUser(null);
        // Don't call logout here to avoid infinite loop, just clear the user
      } else {
        // Other errors - log them for debugging
        const errorData = await response.json().catch(() => ({}));
        console.error('Auth check failed:', response.status, errorData);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check network error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    userRef.current = user;
    isGuestRef.current = isGuest;
  }, [user, isGuest]);

  const refreshTokenIfNeeded = async () => {
    try {
      const response = await authenticatedFetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.refreshed && data.user) {
          setUser(data.user);
          console.log('Token refreshed successfully');
        }
      } else if (response.status === 401) {
        // Session expired, token can't be refreshed
        console.warn('Session expired - cannot refresh token');
        setUser(null);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    setIsGuest(false);
    setGuestId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guest_id');
      localStorage.removeItem('is_guest');
    }
  };

  const startGuestMode = () => {
    setUser(null);
    setIsGuest(true);
    // Create unique guest ID and store it
    const newGuestId = crypto.randomUUID();
    setGuestId(newGuestId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_id', newGuestId);
      localStorage.setItem('is_guest', 'true');
      // Also set this as the cart session ID for consistency
      localStorage.setItem('cart_session_id', newGuestId);
    }
  };

  const logout = useCallback(async (isSessionExpired = false, shouldRedirect = true) => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.warn('Logout request failed, but continuing with local logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsGuest(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guest_id');
        localStorage.removeItem('is_guest');
        // Set flag to show session expired modal if this was an automatic logout
        if (isSessionExpired) {
          sessionStorage.setItem('session_expired', 'true');
        }
      }
      // Only redirect to login if this was a user-initiated logout or session expired
      if (shouldRedirect) {
        router.push('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    // Register logout callback for automatic session expiry handling
    registerLogoutCallback(logout);
    
    checkAuth();
    
    // Set up periodic auth check every 5 minutes to keep session alive
    const authInterval = setInterval(async () => {
      // Only check auth for authenticated users, not guests
      if (!user && !userRef.current) return;
      
      // Check if token is expired on client side first (only for authenticated users)
      if (userRef.current && !isGuestRef.current) {
        const token = getSessionTokenFromCookie();
        if (token && isCurrentSessionExpired()) {
          console.warn('Client-side JWT check: Token expired');
          // Don't redirect, just clear the user
          setUser(null);
          sessionStorage.setItem('session_expired', 'true');
          return;
        }
      }
      
      // First try to refresh the token if needed (only for authenticated users)
      if (userRef.current && !isGuestRef.current) {
        await refreshTokenIfNeeded();
      }
      
      // Then check auth status (for all users)
      await checkAuth();
    }, 5 * 60 * 1000); // 5 minutes

    // Set up a check for token expiration every minute (only for authenticated users)
    const expiryCheckInterval = setInterval(() => {
      // Only check expiry for authenticated users, not guests
      if (userRef.current && !isGuestRef.current) {
        const token = getSessionTokenFromCookie();
        if (token && isCurrentSessionExpired()) {
          console.warn('Session expired detected - logging out');
          // Don't redirect to login on automatic session expiry checks
          // Just clear the user state
          setUser(null);
          sessionStorage.setItem('session_expired', 'true');
        }
      }
    }, 60 * 1000); // 1 minute

    // Cleanup interval and logout callback on unmount
    return () => {
      clearInterval(authInterval);
      clearInterval(expiryCheckInterval);
      unregisterLogoutCallback();
    };
  }, [logout, user]);

  return (
    <AuthContext.Provider value={{
      user,
      isGuest,
      guestId,
      isLoading,
      login,
      logout,
      startGuestMode,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
