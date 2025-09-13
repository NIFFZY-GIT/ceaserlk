import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose'; // Using jose for JWT verification as it's Edge-compatible

// Define the shape of the JWT payload
interface UserJwtPayload {
  userId: number;
  email: string;
  firstName: string;
  role: 'ADMIN' | 'USER';
  iat: number;
  exp: number;
}

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 100; // per IP per window

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting (fallback to a default for localhost)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded || realIp || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    // Reset or create new record
    rateLimitStore.set(key, { count: 1, lastReset: now });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }
  
  record.count++;
  return false;
}

async function verifyJWT(token: string): Promise<UserJwtPayload | null> {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return null;
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify<UserJwtPayload>(token, secret);
    
    // Check token expiration (extra safety check)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}

function createSecureRedirectResponse(url: string, request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(url, request.url));
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

function createSecureNextResponse(): NextResponse {
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting to admin routes and API routes (but exclude auth endpoints)
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/')) && 
      !pathname.startsWith('/api/auth/')) {
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Handle API route protection
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/cart') || pathname.startsWith('/api/orders')) {
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to continue.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(sessionToken);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please log in again.' },
        { status: 401 }
      );
    }

    // Check admin access for admin API routes
    if (pathname.startsWith('/api/admin') && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Continue with the request
    return createSecureNextResponse();
  }

  // If the user is trying to access an admin route
  if (pathname.startsWith('/admin')) {
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      // If there's no token, redirect to the login page
      return createSecureRedirectResponse('/login', request);
    }

    const payload = await verifyJWT(sessionToken);
    
    if (!payload) {
      // If the token is invalid or expired, redirect to login and clear the cookie
      const response = createSecureRedirectResponse('/login', request);
      response.cookies.set('session-token', '', { 
        maxAge: 0, 
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      return response;
    }

    // Check if the user's role is ADMIN
    if (payload.role !== 'ADMIN') {
      // If not an admin, redirect to the homepage
      return createSecureRedirectResponse('/', request);
    }

    // If the user is an admin, allow the request to proceed with security headers
    return createSecureNextResponse();
  }

  // Allow all other requests to pass through with security headers
  return createSecureNextResponse();
}

// Configure the middleware to run on admin routes and protected API routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/cart/:path*',
    '/api/orders/:path*'
  ],
};