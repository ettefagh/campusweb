import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createPinHash, generatePin, getPinExpiration } from '$lib/server/auth/session';
import { isLockedOut, markFailedAttempt } from '$lib/server/auth/abuseStore';
import { isAllowedEmailDomain, normalizeEmail } from '$lib/config/auth';
import { sendLoginPinEmail } from '$lib/server/auth/email';
import { emitSecurityEvent, redactEmail } from '$lib/server/security/events';
import type { RequestHandler } from './$types';

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_PIN_REQUESTS_PER_EMAIL = 5;
const MAX_PIN_REQUESTS_PER_IP = 20;

function getClientAddress(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return 'unknown';

  return forwarded.split(',')[0]?.trim() || 'unknown';
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const now = Date.now();
  const { email } = await request.json().catch(() => ({ email: '' }));
  const normalizedEmail = normalizeEmail(String(email || ''));
  const clientIp = getClientAddress(request);
  const emailRequestKey = `request:email:${normalizedEmail}`;
  const ipRequestKey = `request:ip:${clientIp}`;

  if (
    await isLockedOut(platform?.env, emailRequestKey, now) ||
    await isLockedOut(platform?.env, ipRequestKey, now)
  ) {
    await emitSecurityEvent(platform?.env, {
      kind: 'auth.request_pin.rate_limit',
      severity: 'high',
      message: 'PIN issuance throttled due to request abuse controls.',
      dedupeKey: `auth.request_pin.rate_limit:${normalizedEmail}:${clientIp}`,
      dedupeTtlSeconds: 300,
      details: {
        email: redactEmail(normalizedEmail),
        clientIp
      }
    });
    return json({ error: 'Too many verification requests. Try again later.' }, { status: 429 });
  }

  if (!isAllowedEmailDomain(normalizedEmail)) {
    await markFailedAttempt(platform?.env, ipRequestKey, now, MAX_PIN_REQUESTS_PER_IP, REQUEST_WINDOW_MS);
    return json({ error: 'Only SRH email addresses are accepted.' }, { status: 400 });
  }

  await markFailedAttempt(platform?.env, emailRequestKey, now, MAX_PIN_REQUESTS_PER_EMAIL, REQUEST_WINDOW_MS);
  await markFailedAttempt(platform?.env, ipRequestKey, now, MAX_PIN_REQUESTS_PER_IP, REQUEST_WINDOW_MS);

  if (
    await isLockedOut(platform?.env, emailRequestKey, now) ||
    await isLockedOut(platform?.env, ipRequestKey, now)
  ) {
    await emitSecurityEvent(platform?.env, {
      kind: 'auth.request_pin.rate_limit',
      severity: 'high',
      message: 'PIN issuance throttled after counter threshold reached.',
      dedupeKey: `auth.request_pin.rate_limit:${normalizedEmail}:${clientIp}`,
      dedupeTtlSeconds: 300,
      details: {
        email: redactEmail(normalizedEmail),
        clientIp
      }
    });
    return json({ error: 'Too many verification requests. Try again later.' }, { status: 429 });
  }

  const pin = generatePin();
  const expiresAt = getPinExpiration();
  const hash = await createPinHash(normalizedEmail, pin, expiresAt, platform?.env);

  if (dev) {
    console.info(`[auth] Development PIN: ${pin}`);
  } else {
    try {
      await sendLoginPinEmail(normalizedEmail, pin, platform?.env);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await emitSecurityEvent(platform?.env, {
        kind: 'auth.request_pin.email_delivery_failed',
        severity: 'critical',
        message: 'PIN email delivery failed.',
        dedupeKey: `auth.request_pin.email_delivery_failed:${normalizedEmail}`,
        dedupeTtlSeconds: 120,
        details: {
          email: redactEmail(normalizedEmail),
          error: detail
        }
      });
      return json({ error: 'Verification email delivery failed. Please try again.' }, { status: 502 });
    }
  }

  return json({ hash, expiresAt });
};
