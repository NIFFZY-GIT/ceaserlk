import { NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { getSecureCookieOptions } from '@/lib/auth';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({
      message: 'Logged out successfully.'
    }, { status: 200 });

    // Clear the session cookie securely
    const cookieOptions = {
      ...getSecureCookieOptions(),
      maxAge: 0, // Expire the cookie immediately
    };
    
    const cookie = serialize('session-token', '', cookieOptions);
    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error) {
    console.error('API_LOGOUT_ERROR:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}