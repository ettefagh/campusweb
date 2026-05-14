import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'SRH_CAMPUS_FAVORITES';

const DEFAULT_FAVORITES = [
	'department-directory',
	'schedule',
	'grades',
	'ecampus',
	'library-catalogue',
	'calendar-enhancer',
	'pdf-tools'
];

function createFavoritesStore() {
	let current = [...DEFAULT_FAVORITES];
	
	if (browser) {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					current = parsed.filter(id => typeof id === 'string');
				}
			}
		} catch (e) {
			console.error("Failed to parse cached favorites", e);
		}
	}

	const { subscribe, set, update } = writable<string[]>(current);

	return {
		subscribe,
		toggle: (linkId: string) => {
			if (!linkId) return;
			update(favs => {
				const newFavs = favs.includes(linkId)
					? favs.filter(id => id !== linkId)
					: [...favs, linkId];
				
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavs));
				}
				return newFavs;
			});
		},
		reorder: (fromIndex: number, toIndex: number) => {
			update(favs => {
				if (
					fromIndex === toIndex ||
					fromIndex < 0 ||
					toIndex < 0 ||
					fromIndex >= favs.length ||
					toIndex >= favs.length
				) {
					return favs;
				}

				const next = [...favs];
				const [moved] = next.splice(fromIndex, 1);
				next.splice(toIndex, 0, moved);

				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				}
				return next;
			});
		},
		reset: () => {
			set(DEFAULT_FAVORITES);
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FAVORITES));
			}
		}
	};
}

export const favorites = createFavoritesStore();
