import { json } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME, verifyAnonymousSessionToken } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
  const verified = await verifyAnonymousSessionToken(cookies.get(AUTH_COOKIE_NAME), platform?.env);
  return json({ verified });
};
