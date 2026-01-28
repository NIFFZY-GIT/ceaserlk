"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
      const response = await fetch('/api/auth/me', {
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
        // Token expired or invalid - this is normal, just set user to null
        setUser(null);
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

  const refreshTokenIfNeeded = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
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

  const logout = async () => {
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
      }
      router.push('/login');
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Set up periodic auth check every 5 minutes to keep session alive
    const authInterval = setInterval(async () => {
      // First try to refresh the token if needed
      await refreshTokenIfNeeded();
      // Then check auth status
      await checkAuth();
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup interval on unmount
    return () => clearInterval(authInterval);
  }, []); // Empty dependency array - only run once on mount

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
