import * as jose from 'jose';
import { NextRequest, NextResponse } from 'next/server';

// Define the shape of the JWT payload
export interface UserJwtPayload {
  userId: number;
  email: string;
  firstName: string;
  role: 'ADMIN' | 'USER';
  iat: number;
  exp: number;
}

// JWT Configuration
const JWT_EXPIRY = '30d'; // 30 days
const REFRESH_THRESHOLD = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get JWT secret with validation
 */
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verifies JWT token from cookies and returns user data
 * @param request - The NextRequest object
 * @returns Promise<UserJwtPayload | null> - User data if valid, null if invalid/missing
 */
export async function verifyAuth(request: NextRequest): Promise<UserJwtPayload | null> {
  const sessionToken = request.cookies.get('session-token')?.value;
  return verifySessionToken(sessionToken);
}

/**
 * Verifies admin role from JWT token
 * @param request - The NextRequest object
 * @returns Promise<UserJwtPayload | null> - User data if admin, null otherwise
 */
export async function verifyAdminAuth(request: NextRequest): Promise<UserJwtPayload | null> {
  const user = await verifyAuth(request);
  
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  
  return user;
}

/**
 * Creates a JWT token with enhanced security
 * @param payload - User data to include in token
 * @returns Promise<string> - JWT token
 */
export async function createJWT(payload: Omit<UserJwtPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getJWTSecret();
  
  const jwt = await new jose.SignJWT({
    userId: payload.userId,
    email: payload.email,
    firstName: payload.firstName,
    role: payload.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .setIssuer(process.env.JWT_ISSUER || 'ceaserlk')
    .setAudience(process.env.JWT_AUDIENCE || 'ceaserlk-users')
    .sign(secret);

  return jwt;
}

/**
 * Checks if token should be refreshed (within 7 days of expiry)
 * @param payload - JWT payload
 * @returns boolean - True if token should be refreshed
 */
export function shouldRefreshToken(payload: UserJwtPayload): boolean {
  if (!payload.exp) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;
  
  return timeUntilExpiry <= REFRESH_THRESHOLD;
}

/**
 * Creates a standardized unauthorized response
 */
export function createUnauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    { 
      error: message || 'Authentication required. Please log in to continue.',
      code: 'UNAUTHORIZED'
    },
    { status: 401 }
  );
}

/**
 * Creates a standardized forbidden response
 */
export function createForbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    { 
      error: message || 'Access denied. Insufficient permissions.',
      code: 'FORBIDDEN'
    },
    { status: 403 }
  );
}

/**
 * Creates secure cookie options
 */
export function getSecureCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAge || 30 * 24 * 60 * 60, // 30 days default
  };
}

/**
 * Verifies a raw session token string.
 */
export async function verifySessionToken(token?: string): Promise<UserJwtPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const secret = getJWTSecret();
    const { payload } = await jose.jwtVerify<UserJwtPayload>(token, secret);

    if (!payload.userId || !payload.email || !payload.role) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('JWT payload missing required fields');
      }
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      if (error instanceof jose.errors.JWTExpired) {
        console.warn('JWT token expired');
      } else if (error instanceof jose.errors.JWTInvalid) {
        console.warn('JWT token invalid');
      } else {
        console.error('JWT Verification Error:', error);
      }
    }
    return null;
  }
}