/**
 * Hook to ensure the user has a valid session
 * Automatically redirects to login if session is expired
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isCurrentSessionExpired } from '@/lib/jwt-client';

interface UseRequireAuthOptions {
  redirectTo?: string;
  adminOnly?: boolean;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { redirectTo = '/login', adminOnly = false } = options;

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) return;

    // Check if session is expired on client side
    if (user && isCurrentSessionExpired()) {
      console.warn('Session expired - redirecting to login');
      logout();
      return;
    }

    // If no user and not loading, redirect to login
    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // If admin only and user is not admin, redirect
    if (adminOnly && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, isLoading, router, redirectTo, adminOnly, logout]);

  return { user, isLoading };
}

/**
 * Hook to check session validity without redirecting
 * Useful for components that need to know auth state but don't require it
 */
export function useSessionCheck() {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (isCurrentSessionExpired()) {
        console.warn('Session expired detected in useSessionCheck');
        logout();
      }
    }, 30 * 1000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, logout]);

  return { user };
}
