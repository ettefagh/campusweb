import { redirect, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS,
  createAnonymousSessionToken,
  verifyAnonymousSessionToken
} from '$lib/server/auth/session';

const PROTECTED_API_PREFIXES = ['/api/contacts', '/api/calendar/academic'];
const PROTECTED_PAGE_PREFIXES: string[] = [];

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.instagram.com https://www.tiktok.com; script-src-elem 'self' 'unsafe-inline' https://www.instagram.com https://www.tiktok.com; connect-src 'self' https: wss:; frame-src 'self' https:; worker-src 'self' blob:; upgrade-insecure-requests",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
} as const;

function applySecurityHeaders(response: Response): Response {
  if (!dev) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;

  // Intercept Admin Routes
  if (pathname.startsWith('/admin')) {
    const adminPassword = (event.platform?.env as any)?.PRIVATE_ADMIN_PASSWORD || env.PRIVATE_ADMIN_PASSWORD;

    if (adminPassword) {
      const authHeader = event.request.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new Response('Admin Access Required', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="CampusWeb Admin", charset="UTF-8"'
          }
        });
      }

      const base64Credentials = authHeader.split(' ')[1];
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(':');

      if (username !== 'admin' || password !== adminPassword) {
        return new Response('Unauthorized', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="CampusWeb Admin", charset="UTF-8"'
          }
        });
      }
    } else if (!dev) {
      // In production, strictly lock if no password is set
      return new Response('Admin access disabled (no credentials configured)', { status: 403 });
    }
  }

  const token = event.cookies.get(AUTH_COOKIE_NAME);
  const verified = await verifyAnonymousSessionToken(token, event.platform?.env);

  event.locals.authVerified = verified;

  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!verified && isProtectedApi) {
    return applySecurityHeaders(new Response(JSON.stringify({ error: 'Verification required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  if (!verified && isProtectedPage) {
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  if (verified) {
    const refreshedToken = await createAnonymousSessionToken(event.platform?.env);
    event.cookies.set(AUTH_COOKIE_NAME, refreshedToken, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: AUTH_SESSION_TTL_SECONDS
    });
  }

  return applySecurityHeaders(await resolve(event));
};
