import { json } from '@sveltejs/kit';
import { generalContacts, campusContacts, programDirectors } from '$lib/data/contacts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    generalContacts,
    campusContacts,
    programDirectors
  });
};
