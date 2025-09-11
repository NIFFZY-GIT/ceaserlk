import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Login schema remains the same
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set.');
    }

    const body = await req.json();

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Find the user and also select their role
    const userResult = await pool.query(
      'SELECT user_id, email, first_name, password_hash, role FROM users WHERE email = $1', // <-- CHANGE 1: Select the 'role' column
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Create a JWT payload that now INCLUDES the user's role
    const payload = {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      role: user.role, // <-- CHANGE 2: Add role to the JWT payload
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    // CHANGE 3: Return the user's role in the response body
    // This is what the frontend will use for immediate redirection.
    return NextResponse.json(
      { 
        message: 'Login successful!',
        user: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          role: user.role 
        }
      }, 
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}