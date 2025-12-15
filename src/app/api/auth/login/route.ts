import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { z } from 'zod';
import { createJWT, getSecureCookieOptions } from '@/lib/auth';

// Zod schema for login validation
const loginSchema = z.object({
  email: z.string().email({ message: 'A valid email is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid input.',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // 2. Find user in the database
    const userResult = await db.query(
      'SELECT id, first_name, email, role, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      // SECURITY: Generic error message to prevent email enumeration
      return NextResponse.json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      }, { status: 401 });
    }

    const user = userResult.rows[0];

    // 3. Compare submitted password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // SECURITY: Same generic error message to prevent enumeration
      return NextResponse.json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      }, { status: 401 });
    }

    // 4. Create JWT token using the auth library
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      role: user.role,
    };

    const token = await createJWT(tokenPayload);

    // 5. Prepare the user data for the response body (WITHOUT the password hash)
    const responseUser = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      role: user.role,
    };

    // 6. Create response with secure cookie
    const response = NextResponse.json({
      message: 'Logged in successfully.',
      user: responseUser,
    }, { status: 200 });

    // 7. Set the secure cookie
    const cookieOptions = getSecureCookieOptions();
    const cookie = serialize('session-token', token, cookieOptions);
    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error) {
    console.error('API_LOGIN_ERROR:', error);
    return NextResponse.json({
      error: 'An internal server error occurred.',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}