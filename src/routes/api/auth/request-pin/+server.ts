import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createPinHash, generatePin, getPinExpiration } from '$lib/server/auth/session';
import { isAllowedEmailDomain, normalizeEmail } from '$lib/config/auth';
import { sendLoginPinEmail } from '$lib/server/auth/email';
import type { RequestHandler } from './$types';

const TESTER_EMAIL = 'tester@srh.de';
const TESTER_PIN = '123456';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { email } = await request.json().catch(() => ({ email: '' }));
  const normalizedEmail = normalizeEmail(String(email || ''));

  if (!isAllowedEmailDomain(normalizedEmail)) {
    return json({ error: 'Only SRH email addresses are accepted.' }, { status: 400 });
  }

  const pin = dev && normalizedEmail === TESTER_EMAIL ? TESTER_PIN : generatePin();
  const expiresAt = getPinExpiration();
  const hash = await createPinHash(normalizedEmail, pin, expiresAt, platform?.env);

  if (dev && normalizedEmail === TESTER_EMAIL) {
    console.info(`[auth] Development PIN for ${TESTER_EMAIL}: ${TESTER_PIN}`);
  } else {
    await sendLoginPinEmail(normalizedEmail, pin, platform?.env);
  }

  return json({ hash, expiresAt });
};
