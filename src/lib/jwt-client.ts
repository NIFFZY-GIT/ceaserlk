/**
 * Client-side JWT utilities
 * For checking token expiration on the client side
 */

interface JWTPayload {
  userId?: number;
  email?: string;
  firstName?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Decode JWT token (client-side - without verification)
 * WARNING: This does NOT verify the token signature. Only use for reading data.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Get the expiration time of a JWT token
 */
export function getJWTExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  return new Date(payload.exp * 1000);
}

/**
 * Get time remaining until JWT expires (in seconds)
 */
export function getTimeUntilExpiry(token: string): number {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

/**
 * Check if JWT token will expire soon (within the specified threshold in seconds)
 */
export function willExpireSoon(token: string, thresholdSeconds: number = 300): boolean {
  const timeRemaining = getTimeUntilExpiry(token);
  return timeRemaining > 0 && timeRemaining <= thresholdSeconds;
}

/**
 * Get session token from cookies (client-side)
 */
export function getSessionTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'session-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Check if the current session is expired based on the cookie
 */
export function isCurrentSessionExpired(): boolean {
  const token = getSessionTokenFromCookie();
  if (!token) {
    return true; // No token means expired/not authenticated
  }
  return isJWTExpired(token);
}
