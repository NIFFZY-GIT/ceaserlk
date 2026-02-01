/**
 * Custom hook for making authenticated API calls
 * Automatically handles session expiration
 */

import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch } from '@/lib/fetch-interceptor';
import { useCallback } from 'react';

export function useAuthenticatedFetch() {
  const { logout } = useAuth();

  const authFetch = useCallback(async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const response = await authenticatedFetch(input, init);

    // If we get a 401 and the user is still logged in, trigger logout
    if (response.status === 401) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const isAuthEndpoint = url.includes('/api/auth/logout') || 
                            url.includes('/api/auth/login') || 
                            url.includes('/api/auth/signup');
      
      if (!isAuthEndpoint) {
        console.warn('Session expired - logging out');
        // Delay logout slightly to allow response to be processed
        setTimeout(() => logout(), 100);
      }
    }

    return response;
  }, [logout]);

  return authFetch;
}
