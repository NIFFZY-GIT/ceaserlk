import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { z } from 'zod';

// Constant for cookie expiration (e.g., 30 days)
const MAX_AGE = 60 * 60 * 24 * 30; // in seconds

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
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    }
    const { email, password } = validation.data;

    // 2. Find user in the database
    // We select all the fields we need for the JWT and the response
    const userResult = await db.query(
      'SELECT id, first_name, email, role, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Use a generic error message for security (prevents email enumeration)
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const user = userResult.rows[0];

    // 3. Compare submitted password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // 4. Create JWT token with user data in the payload
    // This payload is exactly what your frontend needs
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name, // Map snake_case from DB to camelCase for JS
      role: user.role, // The crucial field for redirection
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: MAX_AGE,
    });

    // 5. Serialize the cookie
    const cookie = serialize('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });

    // 6. Prepare the user data for the response body (WITHOUT the password hash)
    const responseUser = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      role: user.role,
    };
    
    const response = NextResponse.json({
      message: 'Logged in successfully.',
      user: responseUser, // Send user data back to the frontend
    }, { status: 200 });

    // 7. Set the cookie on the response header and return
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (error) {
    console.error('API_LOGIN_ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}