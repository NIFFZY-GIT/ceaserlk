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

// Enhanced rate limiting for sensitive endpoints
const sensitiveEndpointsLimits = new Map<string, { count: number; lastReset: number }>();
const SENSITIVE_RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const SENSITIVE_RATE_LIMIT_MAX = 10; // much stricter for auth endpoints

const AUTH_SENSITIVE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-reset-code',
];

const AUTH_RATE_LIMIT_EXCEPTIONS = [
  '/api/auth/me',
  '/api/auth/refresh',
];

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting with better fallback handling
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  return cfConnectingIp || forwarded?.split(',')[0] || realIp || 'unknown';
}

function isRateLimited(key: string, isSensitive: boolean = false): boolean {
  const now = Date.now();
  const store = isSensitive ? sensitiveEndpointsLimits : rateLimitStore;
  const window = isSensitive ? SENSITIVE_RATE_LIMIT_WINDOW : RATE_LIMIT_WINDOW;
  const maxAttempts = isSensitive ? SENSITIVE_RATE_LIMIT_MAX : RATE_LIMIT_MAX_ATTEMPTS;
  
  const record = store.get(key);
  
  if (!record || now - record.lastReset > window) {
    // Reset or create new record
    store.set(key, { count: 1, lastReset: now });
    return false;
  }
  
  if (record.count >= maxAttempts) {
    return true;
  }
  
  record.count++;
  return false;
}

// Generate secure random string for CSRF tokens
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
  
  // Enhanced security headers following OWASP recommendations
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0'); // Disable XSS filtering to avoid issues, rely on CSP instead
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy - restrictive but functional
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' blob: https://api.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "frame-src https://checkout.stripe.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

function createSecureNextResponse(init?: Parameters<typeof NextResponse.next>[0]): NextResponse {
  const response = NextResponse.next(init);
  
  // Enhanced security headers following OWASP recommendations
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0'); // Disable XSS filtering, rely on CSP
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' blob: https://api.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "frame-src https://checkout.stripe.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

function createSecureErrorResponse(message: string, status: number): NextResponse {
  const response = NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
      // Don't expose internal details in production
      ...(process.env.NODE_ENV === 'development' && { dev: true })
    },
    { status }
  );
  
  // Add security headers to error responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security logging (in production, use structured logging)
  if (process.env.NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${request.method} ${pathname} - IP: ${getRateLimitKey(request)}`);
  }

  // Apply enhanced rate limiting based on endpoint sensitivity
  const isAuthEndpoint = pathname.startsWith('/api/auth/');
  const isWhitelistedAuthEndpoint = isAuthEndpoint && AUTH_RATE_LIMIT_EXCEPTIONS.some((safePath) => pathname.startsWith(safePath));
  const isSensitiveAuthEndpoint = isAuthEndpoint && !isWhitelistedAuthEndpoint && AUTH_SENSITIVE_ENDPOINTS.some((sensitivePath) => pathname.startsWith(sensitivePath));

  const isSensitiveEndpoint = isSensitiveAuthEndpoint || pathname.startsWith('/api/admin/');

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
    const rateLimitKey = getRateLimitKey(request);
    
    if (isRateLimited(rateLimitKey, isSensitiveEndpoint)) {
      const response = createSecureErrorResponse(
        'Too many requests. Please try again later.',
        429
      );
      response.headers.set('Retry-After', '900'); // 15 minutes
      return response;
    }
  }

  // Validate Content-Type for POST/PUT/PATCH requests to prevent CSRF
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    const isApiRoute = pathname.startsWith('/api/');
    
    if (isApiRoute && contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return createSecureErrorResponse('Invalid content type', 400);
    }
  }

  // Enhanced API route protection
  if (pathname.startsWith('/api/admin') || 
      pathname.startsWith('/api/cart') || 
      pathname.startsWith('/api/orders') ||
      pathname.startsWith('/api/user') ||
      pathname.startsWith('/api/profile')) {
    
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return createSecureErrorResponse(
        'Authentication required. Please log in to continue.',
        401
      );
    }

    const payload = await verifyJWT(sessionToken);
    
    if (!payload) {
      return createSecureErrorResponse(
        'Invalid or expired token. Please log in again.',
        401
      );
    }

    // Check admin access for admin API routes
    if (pathname.startsWith('/api/admin') && payload.role !== 'ADMIN') {
      return createSecureErrorResponse(
        'Access denied. Admin privileges required.',
        403
      );
    }

    // Add user context to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId.toString());
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-email', payload.email);

    return createSecureNextResponse({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Enhanced admin route protection
  if (pathname.startsWith('/admin')) {
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return createSecureRedirectResponse('/login', request);
    }

    const payload = await verifyJWT(sessionToken);
    
    if (!payload) {
      const response = createSecureRedirectResponse('/login', request);
      // Clear invalid cookie
      response.cookies.set('session-token', '', { 
        maxAge: 0, 
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return response;
    }

    // Check admin role
    if (payload.role !== 'ADMIN') {
      return createSecureRedirectResponse('/', request);
    }

    return createSecureNextResponse();
  }

  // Apply security headers to all responses
  return createSecureNextResponse();
}

// Configure the middleware to run on protected routes with enhanced coverage
export const config = {
  matcher: [
    // Admin routes
    '/admin/:path*',
    // API routes that need protection
    '/api/admin/:path*',
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/user/:path*',
    '/api/profile/:path*',
    // Apply security headers to all routes
    '/((?!_next/static|_next/image|favicon.ico|images|uploads).*)',
  ],
};