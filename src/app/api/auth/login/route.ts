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

// Rate limiting for login attempts (simple in-memory store)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 25;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(email: string): { allowed: boolean; remaining?: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(email);
  
  if (!attempts || now - attempts.lastAttempt > LOCKOUT_DURATION) {
    // Reset or create new record
    loginAttempts.set(email, { count: 1, lastAttempt: now });
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - 1 };
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false };
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  
  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - attempts.count };
}

function resetRateLimit(email: string) {
  loginAttempts.delete(email);
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

    // 2. Check rate limiting
    const rateCheck = checkRateLimit(normalizedEmail);
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Too many login attempts. Please try again in 15 minutes.',
        code: 'RATE_LIMITED'
      }, { status: 429 });
    }

    // 3. Find user in the database
    const userResult = await db.query(
      'SELECT id, first_name, email, role, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      // Use a generic error message for security (prevents email enumeration)
      return NextResponse.json({ 
        error: 'No user found with this email address.',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    const user = userResult.rows[0];

    // 4. Compare submitted password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Incorrect password. Please try again.',
        code: 'INVALID_PASSWORD'
      }, { status: 401 });
    }

    // 5. Reset rate limiting on successful login
    resetRateLimit(normalizedEmail);

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