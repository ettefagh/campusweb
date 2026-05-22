import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'SRH_CAMPUS_FAVORITE_CONTACTS';

export const MAX_FAVORITE_CONTACTS = 5;
export type FavoriteContactToggleResult = 'added' | 'removed' | 'limit' | 'invalid';

export function normalizeContactEmail(email: string) {
	return email.trim().toLowerCase();
}

function sanitizeEmails(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	return value
		.map((email) => (typeof email === 'string' ? normalizeContactEmail(email) : ''))
		.filter((email) => {
			if (!email || seen.has(email)) return false;
			seen.add(email);
			return true;
		})
		.slice(0, MAX_FAVORITE_CONTACTS);
}

function readInitialContacts() {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? sanitizeEmails(JSON.parse(raw)) : [];
	} catch (error) {
		console.error('Failed to parse cached favorite contacts', error);
		return [];
	}
}

function persist(emails: string[]) {
	if (browser) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
	}
}

function createFavoriteContactsStore() {
	let current = readInitialContacts();
	const { subscribe, set, update } = writable<string[]>(current);

	function commit(next: string[]) {
		current = sanitizeEmails(next);
		persist(current);
		return current;
	}

	return {
		subscribe,
		toggle(email: string): FavoriteContactToggleResult {
			const normalized = normalizeContactEmail(email);
			if (!normalized) return 'invalid';

			if (current.includes(normalized)) {
				update((emails) => commit(emails.filter((item) => item !== normalized)));
				return 'removed';
			}

			if (current.length >= MAX_FAVORITE_CONTACTS) return 'limit';

			update((emails) => commit([...emails, normalized]));
			return 'added';
		},
		remove(email: string) {
			const normalized = normalizeContactEmail(email);
			if (!normalized) return;
			update((emails) => commit(emails.filter((item) => item !== normalized)));
		},
		reorder(fromIndex: number, toIndex: number) {
			update((emails) => {
				if (
					fromIndex === toIndex ||
					fromIndex < 0 ||
					toIndex < 0 ||
					fromIndex >= emails.length ||
					toIndex >= emails.length
				) {
					return emails;
				}

				const next = [...emails];
				const [moved] = next.splice(fromIndex, 1);
				next.splice(toIndex, 0, moved);
				return commit(next);
			});
		},
		reset() {
			current = [];
			persist(current);
			set(current);
		}
	};
}

export const favoriteContacts = createFavoriteContactsStore();
