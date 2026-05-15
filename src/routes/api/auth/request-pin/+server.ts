import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createPinHash, generatePin, getPinExpiration } from '$lib/server/auth/session';
import { isAllowedEmailDomain, normalizeEmail } from '$lib/config/auth';
import { sendLoginPinEmail } from '$lib/server/auth/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { email } = await request.json().catch(() => ({ email: '' }));
  const normalizedEmail = normalizeEmail(String(email || ''));

  if (!isAllowedEmailDomain(normalizedEmail)) {
    return json({ error: 'Only SRH email addresses are accepted.' }, { status: 400 });
  }

  const pin = generatePin();
  const expiresAt = getPinExpiration();
  const hash = await createPinHash(normalizedEmail, pin, expiresAt, platform?.env);

  if (dev) {
    console.info(`[auth] Development PIN: ${pin}`);
  } else {
    await sendLoginPinEmail(normalizedEmail, pin, platform?.env);
  }

  return json({ hash, expiresAt });
};
