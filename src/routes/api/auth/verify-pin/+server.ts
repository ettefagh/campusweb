import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS,
  constantTimeEqualBase64Url,
  createAnonymousSessionToken,
  createPinHash
} from '$lib/server/auth/session';
import { isAllowedEmailDomain, normalizeEmail } from '$lib/config/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ''));
  const pin = String(body.pin || '').trim();
  const hash = String(body.hash || '');
  const expiresAt = Number(body.expiresAt);

  if (!isAllowedEmailDomain(email) || !/^\d{6}$/.test(pin) || !hash || !Number.isFinite(expiresAt)) {
    return json({ error: 'Invalid verification request.' }, { status: 400 });
  }

  if (expiresAt < Date.now()) {
    return json({ error: 'This PIN has expired. Request a new one.' }, { status: 400 });
  }

  const expectedHash = await createPinHash(email, pin, expiresAt, platform?.env);
  if (!constantTimeEqualBase64Url(expectedHash, hash)) {
    return json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  const token = await createAnonymousSessionToken(platform?.env);
  cookies.set(AUTH_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: !dev,
    sameSite: 'lax',
    maxAge: AUTH_SESSION_TTL_SECONDS
  });

  return json({ verified: true });
};
