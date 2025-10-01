/**
 * Security utilities for input validation, sanitization, and security headers
 * Following OWASP security guidelines and best practices
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

// Enhanced input validation schemas
export const securitySchemas = {
  // Email with enhanced validation
  email: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email address too long') // RFC 5321 limit
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format')
    .transform((email) => email.toLowerCase().trim()),

  // Password with strong requirements
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[a-z]/, 'Password must contain lowercase letters')
    .regex(/[A-Z]/, 'Password must contain uppercase letters')
    .regex(/[0-9]/, 'Password must contain numbers')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain special characters'),

  // Safe string input (prevents XSS)
  safeString: z
    .string()
    .max(1000, 'Input too long')
    .regex(/^[^<>\"'&]*$/, 'Invalid characters detected'),

  // UUID validation
  uuid: z
    .string()
    .uuid('Invalid UUID format'),

  // Positive integer
  positiveInt: z
    .number()
    .int('Must be an integer')
    .positive('Must be positive'),

  // Safe filename
  filename: z
    .string()
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes SQL input to prevent injection (use with parameterized queries)
 */
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['";-]/g, '') // Remove common SQL injection patterns
    .trim();
}

/**
 * Rate limiting in-memory store (use Redis in production)
 */
class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  isLimited(key: string): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (record.count >= this.maxRequests) {
      return true;
    }

    record.count++;
    return false;
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

// Rate limiters for different endpoint types
export const rateLimiters = {
  auth: new RateLimiter(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  api: new RateLimiter(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  upload: new RateLimiter(10, 60 * 1000), // 10 uploads per minute
};

/**
 * Security headers configuration following OWASP recommendations
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0', // Disable to avoid issues, rely on CSP
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com",
    "frame-src https://checkout.stripe.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

/**
 * Creates secure API response with proper headers and error handling
 */
export function createSecureApiResponse(
  data: Record<string, unknown> | unknown[],
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(
    {
      ...data,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { env: 'development' })
    },
    { status }
  );

  // Apply security headers
  Object.entries({ ...securityHeaders, ...headers }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Cache control for sensitive data
  if (status >= 400 || (typeof data === 'object' && data !== null && 'sensitive' in data)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return response;
}

/**
 * Secure error response that doesn't leak sensitive information
 */
export function createSecureErrorResponse(
  error: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return createSecureApiResponse(
    {
      error: isProduction ? getGenericErrorMessage(status) : error,
      code: getErrorCode(status),
      ...(details && !isProduction && { details })
    },
    status
  );
}

/**
 * Get generic error messages that don't expose internal details
 */
function getGenericErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Resource not found';
    case 429:
      return 'Too many requests';
    case 500:
      return 'Internal server error';
    default:
      return 'An error occurred';
  }
}

/**
 * Get standardized error codes
 */
function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  };
  
  return codes[status] || 'UNKNOWN_ERROR';
}

/**
 * Validates environment variables for security
 */
export function validateEnvironment(): void {
  const requiredEnvs = [
    'JWT_SECRET',
    'DATABASE_URL',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ];

  const missing = requiredEnvs.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Warn about weak CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.includes('generate_a_very_strong')) {
    console.warn('⚠️  WARNING: CRON_SECRET is using default placeholder value');
  }
}

/**
 * Secure logging that excludes sensitive information
 */
export function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'email'];
  
  let sanitizedData: Record<string, unknown> | undefined;
  if (data && typeof data === 'object') {
    const clone: Record<string, unknown> = { ...data };
    sensitiveFields.forEach(field => {
      if (field in clone) {
        clone[field] = '[REDACTED]';
      }
    });
    sanitizedData = clone;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(sanitizedData && { data: sanitizedData }),
    pid: process.pid,
    env: process.env.NODE_ENV
  };

  console[level](JSON.stringify(logEntry));
}