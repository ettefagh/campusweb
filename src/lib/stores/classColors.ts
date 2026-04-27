import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'calendar_class_colors';

function createClassColorsStore() {
    const { subscribe, set, update } = writable<Record<string, string>>({});

    if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                set(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to load class colors', e);
            }
        }
    }

    return {
        subscribe,
        updateColor: (groupId: string, color: string) => {
            update(colors => {
                const newColors = { ...colors, [groupId]: color };
                if (browser) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newColors));
                }
                return newColors;
            });
        },
        resetColor: (groupId: string) => {
            update(colors => {
                const newColors = { ...colors };
                delete newColors[groupId];
                if (browser) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newColors));
                }
                return newColors;
            });
        }
    };
}

export const classColors = createClassColorsStore();
