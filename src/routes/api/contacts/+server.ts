import { json } from '@sveltejs/kit';
import { generalContacts, campusContacts, programDirectors } from '$lib/data/contacts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.authVerified) {
    return json({ error: 'Verification required.' }, { status: 401 });
  }

  return json({
    generalContacts,
    campusContacts,
    programDirectors
  });
};
