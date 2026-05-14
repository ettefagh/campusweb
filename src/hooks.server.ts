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

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(AUTH_COOKIE_NAME);
  const verified = await verifyAnonymousSessionToken(token, event.platform?.env);

  event.locals.authVerified = verified;

  const pathname = event.url.pathname;
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!verified && isProtectedApi) {
    return new Response(JSON.stringify({ error: 'Verification required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
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

  return resolve(event);
};
