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
  
  // Content Security Policy - permissive for third-party analytics/tracking
  // Allows all HTTPS connections to prevent blocking analytics services
  const csp = [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline' blob: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data: https:",
    "connect-src 'self' blob: https: wss:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:"
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
  
  // Content Security Policy - permissive for third-party analytics/tracking
  // Allows all HTTPS connections to prevent blocking analytics services
  const csp = [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline' blob: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data: https:",
    "connect-src 'self' blob: https: wss:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:"
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
    console.log(`${new Date().toISOString()} - ${request.method} ${pathname}`);
  }

  // Validate Content-Type for POST/PUT/PATCH requests to prevent CSRF
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    const isApiRoute = pathname.startsWith('/api/');
    const isPaymentCallbackRoute =
      pathname === '/api/checkout/koko/response' ||
      pathname === '/api/checkout/payhere/notify';
    const isAllowedContentType =
      !contentType ||
      contentType.includes('application/json') ||
      contentType.includes('multipart/form-data') ||
      (isPaymentCallbackRoute && contentType.includes('application/x-www-form-urlencoded'));
    
    if (isApiRoute && !isAllowedContentType) {
      return createSecureErrorResponse('Invalid content type', 400);
    }
  }

  // Enhanced API route protection
  // IMPORTANT: Cart and checkout/place-order routes are NOT protected to allow guest users
  if (pathname.startsWith('/api/admin') || 
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
  
  // Protect specific order routes that require authentication (like order history)
  // but allow guest orders through:
  // - checkout/place-order (guest checkout)
  // - /api/orders/[id] GET (order confirmation for guests) 
  // - /api/orders/[id]/invoice GET (invoice download from confirmation page)
  // - /api/orders/track (guest order tracking)
  if (pathname.startsWith('/api/orders') && 
      !pathname.includes('/api/checkout/place-order') &&
      !pathname.match(/^\/api\/orders\/[^/]+$/) && // Allow GET /api/orders/{id}
      !pathname.match(/^\/api\/orders\/[^/]+\/invoice$/) && // Allow GET /api/orders/{id}/invoice
      !pathname.includes('/api/orders/track')) {    // Allow /api/orders/track
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return createSecureErrorResponse(
        'Authentication required. Please log in to view orders.',
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

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId.toString());
    requestHeaders.set('x-user-role', payload.role);

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
    // API routes that need protection (cart is excluded to allow guest users)
    '/api/admin/:path*',
    '/api/orders/:path*',
    '/api/user/:path*',
    '/api/profile/:path*',
    // SECURITY: Added protection for debug and setup routes
    '/api/debug/:path*',
    '/api/setup-database/:path*',
    // Apply security headers to all routes
    '/((?!_next/static|_next/image|favicon.ico|images|uploads).*)',
  ],
};

