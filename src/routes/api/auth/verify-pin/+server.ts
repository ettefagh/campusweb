import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS,
  constantTimeEqualBase64Url,
  createAnonymousSessionToken,
  createPinHash
} from '$lib/server/auth/session';
import {
  clearFailedAttempts,
  isLockedOut,
  isReplayChallengeUsed,
  markFailedAttempt,
  markReplayChallengeUsed
} from '$lib/server/auth/abuseStore';
import { isAllowedEmailDomain, normalizeEmail } from '$lib/config/auth';
import { emitSecurityEvent, redactEmail } from '$lib/server/security/events';
import type { RequestHandler } from './$types';

const MAX_FAILED_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const USED_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS_PER_EMAIL = 12;
const MAX_FAILED_ATTEMPTS_PER_IP = 30;

function getClientAddress(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return 'unknown';

  return forwarded.split(',')[0]?.trim() || 'unknown';
}


export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  const now = Date.now();

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ''));
  const pin = String(body.pin || '').trim();
  const hash = String(body.hash || '');
  const expiresAt = Number(body.expiresAt);
  const clientIp = getClientAddress(request);
  const attemptKey = `${email}|${clientIp}`;
  const emailAttemptKey = `email:${email}`;
  const ipAttemptKey = `ip:${clientIp}`;
  const challengeKey = `${email}|${hash}|${expiresAt}`;

  if (!isAllowedEmailDomain(email) || !/^\d{6}$/.test(pin) || !hash || !Number.isFinite(expiresAt)) {
    return json({ error: 'Invalid verification request.' }, { status: 400 });
  }

  if (
    await isLockedOut(platform?.env, attemptKey, now) ||
    await isLockedOut(platform?.env, emailAttemptKey, now) ||
    await isLockedOut(platform?.env, ipAttemptKey, now)
  ) {
    await emitSecurityEvent(platform?.env, {
      kind: 'auth.verify_pin.rate_limit',
      severity: 'high',
      message: 'PIN verification blocked by abuse controls.',
      dedupeKey: `auth.verify_pin.rate_limit:${email}:${clientIp}`,
      dedupeTtlSeconds: 300,
      details: {
        email: redactEmail(email),
        clientIp
      }
    });
    return json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
  }

  if (await isReplayChallengeUsed(platform?.env, challengeKey, now)) {
    await emitSecurityEvent(platform?.env, {
      kind: 'auth.verify_pin.replay_attempt',
      severity: 'high',
      message: 'Replay attempt detected for PIN verification challenge.',
      dedupeKey: `auth.verify_pin.replay:${email}:${hash}:${expiresAt}`,
      dedupeTtlSeconds: 300,
      details: {
        email: redactEmail(email),
        clientIp
      }
    });
    return json({ error: 'This verification request has already been used.' }, { status: 409 });
  }

  if (expiresAt < now) {
    return json({ error: 'This PIN has expired. Request a new one.' }, { status: 400 });
  }

  const expectedHash = await createPinHash(email, pin, expiresAt, platform?.env);
  if (!constantTimeEqualBase64Url(expectedHash, hash)) {
    await markFailedAttempt(platform?.env, attemptKey, now, MAX_FAILED_ATTEMPTS, ATTEMPT_WINDOW_MS);
    await markFailedAttempt(platform?.env, emailAttemptKey, now, MAX_FAILED_ATTEMPTS_PER_EMAIL, ATTEMPT_WINDOW_MS);
    await markFailedAttempt(platform?.env, ipAttemptKey, now, MAX_FAILED_ATTEMPTS_PER_IP, ATTEMPT_WINDOW_MS);
    return json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  await markReplayChallengeUsed(platform?.env, challengeKey, now, USED_CHALLENGE_TTL_MS);
  await clearFailedAttempts(platform?.env, attemptKey);
  await clearFailedAttempts(platform?.env, emailAttemptKey);
  await clearFailedAttempts(platform?.env, ipAttemptKey);

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
