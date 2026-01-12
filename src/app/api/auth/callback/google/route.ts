import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serialize } from 'cookie';
import { createJWT, getSecureCookieOptions } from '@/lib/auth';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=google_auth_cancelled`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=missing_auth_code`
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_not_configured`
      );
    }

    // Decode state parameter
    let stateData: { redirect: string; mode: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=invalid_state`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=token_exchange_failed`
      );
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=failed_to_get_user_info`
      );
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    // Check if user exists in our database
    const existingUserResult = await db.query(
      'SELECT id, first_name, last_name, email, role, google_id FROM users WHERE email = $1 OR google_id = $2',
      [googleUser.email.toLowerCase(), googleUser.sub]
    );

    let user;
    const normalizedEmail = googleUser.email.toLowerCase();
    let isNewUser = false;

    if (existingUserResult.rows.length > 0) {
      // User exists - update google_id if not set
      user = existingUserResult.rows[0];
      
      if (!user.google_id) {
        await db.query(
          'UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [googleUser.sub, user.id]
        );
      }
    } else {
      // Create new user (signup mode)
      isNewUser = true;
      const firstName = googleUser.given_name || googleUser.name?.split(' ')[0] || 'User';
      const lastName = googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '';

      const insertResult = await db.query(
        `INSERT INTO users (first_name, last_name, email, google_id, password_hash, is_verified, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, first_name, last_name, email, role`,
        [
          firstName,
          lastName,
          normalizedEmail,
          googleUser.sub,
          '', // No password for Google users (they authenticate via Google)
          true, // Google-authenticated users are automatically verified
          'USER',
        ]
      );

      user = insertResult.rows[0];
    }

    // Create JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      role: user.role,
    };

    const jwtToken = await createJWT(tokenPayload);

    // Build redirect URL - add newUser flag for popup
    const redirectUrl = stateData.redirect || '/';
    let finalRedirectUrl = user.role === 'ADMIN' && redirectUrl === '/' 
      ? '/admin/dashboard' 
      : redirectUrl;
    
    // Add new user flag to URL if this is a new registration
    if (isNewUser && user.role !== 'ADMIN') {
      const separator = finalRedirectUrl.includes('?') ? '&' : '?';
      finalRedirectUrl = `${finalRedirectUrl}${separator}newUser=true`;
    }

    // Create response with redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${finalRedirectUrl}`
    );

    // Set session cookie
    const cookieOptions = getSecureCookieOptions();
    response.headers.set(
      'Set-Cookie',
      serialize('session-token', jwtToken, cookieOptions)
    );

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=authentication_failed`
    );
  }
}
