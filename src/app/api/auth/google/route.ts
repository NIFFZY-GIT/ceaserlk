import { NextResponse } from 'next/server';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`;

// Google OAuth scopes we need
const SCOPES = [
  'openid',
  'email',
  'profile',
].join(' ');

export async function GET(request: Request) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured' },
        { status: 500 }
      );
    }

    // Get the redirect URL from query params (for post-login redirect)
    const url = new URL(request.url);
    const redirectAfterLogin = url.searchParams.get('redirect') || '/';
    const mode = url.searchParams.get('mode') || 'login'; // 'login' or 'signup'

    // Create state parameter with redirect info (encoded as base64)
    const state = Buffer.from(JSON.stringify({
      redirect: redirectAfterLogin,
      mode: mode,
      nonce: crypto.randomUUID(),
    })).toString('base64url');

    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', SCOPES);
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    // Redirect to Google
    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
