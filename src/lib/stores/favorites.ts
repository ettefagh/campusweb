import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'SRH_CAMPUS_FAVORITES';

// Default favorites
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
	// Start with defaults, let it hydrate safely
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
		reset: () => {
			set(DEFAULT_FAVORITES);
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FAVORITES));
			}
		}
	};
}

export const favorites = createFavoritesStore();
