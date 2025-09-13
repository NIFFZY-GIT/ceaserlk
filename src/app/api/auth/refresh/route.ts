import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, createJWT, getSecureCookieOptions, shouldRefreshToken } from '@/lib/auth';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    // Verify the current token
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required. Please log in to continue.',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Check if the token should be refreshed (within 7 days of expiry)
    if (!shouldRefreshToken(user)) {
      return NextResponse.json(
        { 
          message: 'Token does not need refreshing yet.',
          user: {
            userId: user.userId,
            email: user.email,
            firstName: user.firstName,
            role: user.role,
          }
        },
        { status: 200 }
      );
    }

    // Create a new token with the same user data
    const newToken = await createJWT({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
    });

    // Prepare response
    const responseUser = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
    };

    const response = NextResponse.json({
      message: 'Token refreshed successfully.',
      user: responseUser,
      refreshed: true
    }, { status: 200 });

    // Set the new token as a cookie
    const cookieOptions = getSecureCookieOptions();
    const cookie = serialize('session-token', newToken, cookieOptions);
    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error) {
    console.error('API_REFRESH_TOKEN_ERROR:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}