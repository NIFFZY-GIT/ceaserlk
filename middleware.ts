import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // CORS Headers - Fully open
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', '*');
  response.headers.set('Access-Control-Allow-Headers', '*');
  response.headers.set('Access-Control-Expose-Headers', '*');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};