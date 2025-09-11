import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose'; // Using jose for JWT verification as it's Edge-compatible

// Define the shape of the JWT payload
interface UserJwtPayload {
  userId: number;
  role: 'ADMIN' | 'USER';
  iat: number;
  exp: number;
}

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;

  // If the user is trying to access an admin route
  if (pathname.startsWith('/admin')) {
    if (!sessionToken) {
      // If there's no token, redirect to the login page
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verify the token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify<UserJwtPayload>(sessionToken, secret);

      // Check if the user's role is ADMIN
      if (payload.role !== 'ADMIN') {
        // If not an admin, redirect to the homepage
        return NextResponse.redirect(new URL('/', request.url));
      }

      // If the user is an admin, allow the request to proceed
      return NextResponse.next();

    } catch (err) {
      // If the token is invalid or expired, redirect to login
      console.error('JWT Verification Error:', err);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Allow all other requests to pass through
  return NextResponse.next();
}

// Configure the middleware to run only on admin routes
export const config = {
  matcher: '/admin/:path*',
};