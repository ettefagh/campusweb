import { json } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
  return json({ verified: false });
};
