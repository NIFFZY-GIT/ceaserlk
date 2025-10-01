import { headers } from 'next/headers';

/**
 * Resolve the current request's base URL within a server component or route handler.
 * Falls back to deployment environment variables and finally a localhost default.
 */
export async function resolveServerBaseUrl(): Promise<string> {
  const fallbackEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  try {
    const incomingHeaders = await headers();
    const host = incomingHeaders.get('x-forwarded-host') || incomingHeaders.get('host');
    if (host) {
      const protocol = incomingHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      return `${protocol}://${host}`;
    }
  } catch {
    // headers() throws when invoked outside a request context. Ignore and use fallbacks.
  }

  if (fallbackEnv) {
    if (fallbackEnv.startsWith('http')) {
      return fallbackEnv;
    }
    return `https://${fallbackEnv}`;
  }

  return 'http://localhost:3000';
}

/**
 * Serialize the incoming request cookies so they can be forwarded in server-side fetch calls.
 */
export async function serializeRequestCookies(): Promise<string | undefined> {
  try {
    const incomingHeaders = await headers();
    return incomingHeaders.get('cookie') || undefined;
  } catch {
    return undefined;
  }
}
