import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { serialize } from 'cookie';
import { z } from 'zod';
import { createJWT, getSecureCookieOptions } from '@/lib/auth';

// Zod schema for login validation
const loginSchema = z.object({
  email: z.string().email({ message: 'A valid email is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type RateLimitRecord = {
  count: number;
  firstAttempt: number;
};

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

function getClientIdentifier(request: Request, email: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `${email}::${ip}`;
}

function getRateLimitStatus(identifier: string) {
  const record = loginAttempts.get(identifier);
  if (!record) {
    return { blocked: false, remaining: MAX_LOGIN_ATTEMPTS };
  }

  const elapsed = Date.now() - record.firstAttempt;
  if (elapsed > LOCKOUT_DURATION) {
    loginAttempts.delete(identifier);
    return { blocked: false, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterMs = Math.max(LOCKOUT_DURATION - elapsed, 0);
    return { blocked: true, retryAfterMs, remaining: 0 };
  }

  return { blocked: false, remaining: Math.max(MAX_LOGIN_ATTEMPTS - record.count, 0) };
}

function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now - record.firstAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return;
  }

  record.count += 1;
  loginAttempts.set(identifier, record);
}

function resetRateLimit(identifier: string) {
  loginAttempts.delete(identifier);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input.',
        details: validation.error.issues
      }, { status: 400 });
    }
    
    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // 2. Check rate limiting (per email + client IP)
    const rateLimitIdentifier = getClientIdentifier(request, normalizedEmail);
    const rateStatus = getRateLimitStatus(rateLimitIdentifier);
    if (rateStatus.blocked) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateStatus.retryAfterMs || 0) / 1000));
      const response = NextResponse.json({
        error: 'Too many login attempts detected. Please wait a few minutes and try again.',
        code: 'RATE_LIMITED',
        retryAfterSeconds,
      }, { status: 429 });
      response.headers.set('Retry-After', String(retryAfterSeconds));
      return response;
    }

    // 3. Find user in the database
    const userResult = await db.query(
      'SELECT id, first_name, email, role, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      // Use a generic error message for security (prevents email enumeration)
      recordFailedAttempt(rateLimitIdentifier);
      const retryStatus = getRateLimitStatus(rateLimitIdentifier);
      const retryAfterSeconds = retryStatus.blocked ? Math.max(1, Math.ceil((retryStatus.retryAfterMs || 0) / 1000)) : undefined;
      const response = NextResponse.json({ 
        error: 'No user found with this email address.',
        code: 'USER_NOT_FOUND',
        remainingAttempts: retryStatus.blocked ? 0 : retryStatus.remaining,
        retryAfterSeconds,
      }, { status: 404 });
      if (retryAfterSeconds) {
        response.headers.set('Retry-After', String(retryAfterSeconds));
      }
      return response;
    }

    const user = userResult.rows[0];

    // 4. Compare submitted password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      recordFailedAttempt(rateLimitIdentifier);
      const retryStatus = getRateLimitStatus(rateLimitIdentifier);
      const retryAfterSeconds = retryStatus.blocked ? Math.max(1, Math.ceil((retryStatus.retryAfterMs || 0) / 1000)) : undefined;
      const response = NextResponse.json({ 
        error: 'Incorrect password. Please try again.',
        code: 'INVALID_PASSWORD',
        remainingAttempts: retryStatus.blocked ? 0 : retryStatus.remaining,
        retryAfterSeconds,
      }, { status: 401 });
      if (retryAfterSeconds) {
        response.headers.set('Retry-After', String(retryAfterSeconds));
      }
      return response;
    }

    // 5. Reset rate limiting on successful login
    resetRateLimit(rateLimitIdentifier);

    // 6. Create JWT token using the new auth library
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      role: user.role,
    };
    
    const token = await createJWT(tokenPayload);

    // 7. Prepare the user data for the response body (WITHOUT the password hash)
    const responseUser = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      role: user.role,
    };
    
    // 8. Create response with secure cookie
    const response = NextResponse.json({
      message: 'Logged in successfully.',
      user: responseUser,
    }, { status: 200 });

    // 9. Set the secure cookie
    const cookieOptions = getSecureCookieOptions();
    const cookie = serialize('session-token', token, cookieOptions);
    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error) {
    console.error('API_LOGIN_ERROR:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}