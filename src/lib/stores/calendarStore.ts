import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { CalendarEvent } from '$lib/utils/icalParser';
import { parseICalEvents, extractCalendarName } from '$lib/utils/icalParser';

export interface CalendarSubscription {
    id: string;
    url: string;
    name: string;
    color: string;
    lastUpdated: number;
    cachedEvents: CalendarEvent[];
}

const STORAGE_KEY = 'calendar_subscriptions';
const UPDATE_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

function createCalendarStore() {
    const { subscribe, set, update } = writable<CalendarSubscription[]>([]);

    // Load from local storage on initialization
    if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Convert stored date strings back to Date objects
                const hydrated = parsed.map((sub: any) => ({
                    ...sub,
                    cachedEvents: sub.cachedEvents.map((evt: any) => ({
                        ...evt,
                        start: new Date(evt.start),
                        end: new Date(evt.end)
                    }))
                }));
                set(hydrated);
            } catch (e) {
                console.error('Failed to load subscriptions', e);
            }
        }
    }

    return {
        subscribe,
        
        add: async (url: string, name: string = 'My Calendar') => {
            const id = crypto.randomUUID();
            let color = '#10b981'; // Default green for personal calendars
            
            update(subs => {
                const usedColors = subs.map(s => s.color);
                const PRESET_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
                color = PRESET_COLORS.find(c => !usedColors.includes(c)) || PRESET_COLORS[subs.length % PRESET_COLORS.length];
                return subs;
            });
            
            // Initial fetch
            try {
                const result = await fetchCalendarEvents(url, id, color);
                
                update(subs => {
                    return [...subs, {
                        id,
                        url,
                        name: result.name || name,
                        color,
                        lastUpdated: Date.now(),
                        cachedEvents: result.events
                    }];
                });
                return true;
            } catch (e) {
                console.error('Failed to add calendar:', e);
                return false;
            }
        },

        remove: (id: string) => {
            update(subs => {
                return subs.filter(s => s.id !== id);
            });
        },

        refreshAll: async (force = false) => {
            const now = Date.now();
            update(subs => {
                subs.forEach(async (sub) => {
                    if (force || (now - sub.lastUpdated > UPDATE_INTERVAL)) {
                        try {
                            const result = await fetchCalendarEvents(sub.url, sub.id, sub.color);
                            update(currentSubs => {
                                return currentSubs.map(s => 
                                    s.id === sub.id 
                                        ? { ...s, lastUpdated: Date.now(), cachedEvents: result.events, name: result.name || s.name }
                                        : s
                                );
                            });
                        } catch (e) {
                            console.error(`Failed to refresh calendar ${sub.name}:`, e);
                        }
                    }
                });
                return subs;
            });
        },
    };
}

// Helper to fetch with a timeout
async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function fetchCalendarEvents(url: string, id: string, color: string): Promise<{events: CalendarEvent[], name: string|null}> {
    // Strategy 1: Server-side proxy (bypasses CORS via Cloudflare Worker)
    try {
        const proxyUrl = `/api/ical-proxy?url=${encodeURIComponent(url)}`;
        const response = await fetchWithTimeout(proxyUrl, {}, 12000);
        if (response.ok) {
            const text = await response.text();
            return {
                events: parseICalEvents(text, id, color, color),
                name: extractCalendarName(text)
            };
        }
        // If proxy returned an error, log it and try direct
        const errBody = await response.text().catch(() => '');
        console.warn(`Proxy returned ${response.status}: ${errBody}`);
    } catch (e) {
        console.warn('Server proxy failed, trying direct fetch...', e);
    }

    // Strategy 2: Direct fetch (works if the calendar server has permissive CORS)
    try {
        const response = await fetchWithTimeout(url);
        if (response.ok) {
            const text = await response.text();
            return {
                events: parseICalEvents(text, id, color, color),
                name: extractCalendarName(text)
            };
        }
    } catch (e) {
        console.warn('Direct fetch also failed', e);
    }

    throw new Error('Failed to fetch calendar. Please check the URL and try again.');
}

export const calendarStore = createCalendarStore();

// Centralized persistence
if (browser) {
    calendarStore.subscribe(subs => {
        if (subs && subs.length >= 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
        }
    });
}
