import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface UserJwtPayload {
  userId: number;
  email: string;
  firstName: string;
  role: 'ADMIN' | 'USER';
  iat: number;
  exp: number;
}

export async function GET() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set.');
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token found' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET) as UserJwtPayload;
      
      return NextResponse.json({
        user: {
          userId: decoded.userId,
          email: decoded.email,
          firstName: decoded.firstName,
          role: decoded.role,
        }
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
    }

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
