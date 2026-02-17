/**
 * Session validation utilities
 * Provides utilities to check session validity and handle session expiration
 */

/**
 * Check if a response indicates an expired or invalid session
 */
export function isSessionInvalid(response: Response): boolean {
  return response.status === 401;
}

/**
 * Check if the error indicates a session expiration
 */
type SessionErrorLike = {
  status?: number;
  response?: { status?: number };
  code?: string;
};

const isSessionErrorLike = (error: unknown): error is SessionErrorLike => {
  return typeof error === 'object' && error !== null;
};

export function isSessionError(error: unknown): boolean {
  if (!isSessionErrorLike(error)) return false;
  if (error.status === 401) return true;
  if (error.response?.status === 401) return true;
  if (error.code === 'UNAUTHORIZED') return true;
  return false;
}

/**
 * Parse error response and check for session expiration
 */
export async function checkSessionFromResponse(response: Response): Promise<{ expired: boolean; message?: string }> {
  if (response.status === 401) {
    try {
      const data = await response.json();
      return {
        expired: true,
        message: data.error || 'Your session has expired. Please log in again.',
      };
    } catch {
      return {
        expired: true,
        message: 'Your session has expired. Please log in again.',
      };
    }
  }
  return { expired: false };
}

/**
 * Middleware-like function to validate session before API calls
 */
export async function validateSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}
