import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify the user's authentication
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

    // Return user data (without sensitive information)
    const responseUser = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
    };

    return NextResponse.json({
      user: responseUser,
      authenticated: true
    }, { status: 200 });

  } catch (error) {
    console.error('API_AUTH_ME_ERROR:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}