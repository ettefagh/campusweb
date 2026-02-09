import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'SRH_CAMPUS_FAVORITES';

// Default favorites
const DEFAULT_FAVORITES = [
	'campusweb',
	'schedule',
	'grades',
	'ecampus',
	'library-catalogue',
	'calendar-enhancer',
	'pdf-tools'
];

function createFavoritesStore() {
	// Load from localStorage on client
	const initialFavorites = browser
		? JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_FAVORITES))
		: DEFAULT_FAVORITES;

	const { subscribe, set, update } = writable<string[]>(initialFavorites);

	return {
		subscribe,
		toggle: (linkId: string) => {
			update(favs => {
				const newFavs = favs.includes(linkId)
					? favs.filter(id => id !== linkId)
					: [...favs, linkId];
				
				// Persist to localStorage
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
