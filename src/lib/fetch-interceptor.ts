/**
 * Fetch interceptor utility for handling expired sessions
 * Automatically triggers logout when receiving 401 responses
 */

type LogoutCallback = () => void;

let globalLogoutCallback: LogoutCallback | null = null;

/**
 * Register a callback to be called when session expires
 */
export function registerLogoutCallback(callback: LogoutCallback) {
  globalLogoutCallback = callback;
}

/**
 * Unregister the logout callback
 */
export function unregisterLogoutCallback() {
  globalLogoutCallback = null;
}

/**
 * Enhanced fetch wrapper that handles session expiration
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, {
      ...init,
      credentials: init?.credentials || 'include',
    });

    // If we get a 401 (Unauthorized), it means the session/JWT has expired
    if (response.status === 401) {
      // Check if this is an auth endpoint (to avoid infinite loops)
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const isAuthEndpoint = url.includes('/api/auth/logout') || 
                            url.includes('/api/auth/login') || 
                            url.includes('/api/auth/signup');

      // Only trigger logout if it's not an auth endpoint
      if (!isAuthEndpoint && globalLogoutCallback) {
        console.warn('Session expired - logging out user');
        // Use setTimeout to avoid blocking the response
        setTimeout(() => {
          globalLogoutCallback?.();
        }, 0);
      }
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Check if the response indicates an expired session
 */
export function isSessionExpired(response: Response): boolean {
  if (response.status === 401) {
    return true;
  }
  return false;
}
