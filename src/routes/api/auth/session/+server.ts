import { json } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME, getSessionDetails } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
  const session = await getSessionDetails(cookies.get(AUTH_COOKIE_NAME), platform?.env);
  return json(session);
};
