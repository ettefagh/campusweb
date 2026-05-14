import { json } from '@sveltejs/kit';
import { publicContacts } from '$lib/data/contacts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({ publicContacts });
};
