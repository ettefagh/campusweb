import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { CalendarEvent } from '$lib/utils/icalParser';
import { parseICalEvents } from '$lib/utils/icalParser';

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
            const color = '#10b981'; // Default green for personal calendars
            
            // Initial fetch
            try {
                const events = await fetchCalendarEvents(url, id, color);
                
                update(subs => {
                    const newSubs = [...subs, {
                        id,
                        url,
                        name,
                        color,
                        lastUpdated: Date.now(),
                        cachedEvents: events
                    }];
                    if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs));
                    return newSubs;
                });
                return true;
            } catch (e) {
                console.error('Failed to add calendar:', e);
                return false;
            }
        },

        remove: (id: string) => {
            update(subs => {
                const newSubs = subs.filter(s => s.id !== id);
                if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs));
                return newSubs;
            });
        },

        refreshAll: async () => {
            update(subs => {
                // Determine which subs need updating
                const now = Date.now();
                
                subs.forEach(async (sub) => {
                    if (now - sub.lastUpdated > UPDATE_INTERVAL) {
                        try {
                            const newEvents = await fetchCalendarEvents(sub.url, sub.id, sub.color);
                            update(currentSubs => {
                                const updated = currentSubs.map(s => 
                                    s.id === sub.id 
                                        ? { ...s, lastUpdated: now, cachedEvents: newEvents }
                                        : s
                                );
                                if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                                return updated;
                            });
                        } catch (e) {
                            console.error(`Failed to refresh calendar ${sub.name}:`, e);
                        }
                    }
                });
                return subs;
            });
        }
    };
}

// Helper to fetch and parse events with fallback strategies
async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
    const { timeout = 15000 } = options as any;
    
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

async function fetchCalendarEvents(url: string, id: string, color: string): Promise<CalendarEvent[]> {
    let error: any;
    
    // Strategy 1: Direct Fetch (Best if server supports CORS)
    try {
        console.log('Attempting direct fetch...');
        const response = await fetchWithTimeout(url);
        if (response.ok) {
            const text = await response.text();
            return parseICalEvents(text, id, color, color);
        }
    } catch (e) {
        console.warn('Direct fetch failed, trying proxy...', e);
    }

    // Strategy 2: corsproxy.io
    try {
        console.log('Attempting corsproxy.io...');
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetchWithTimeout(proxyUrl);
        if (response.ok) {
            const text = await response.text();
            return parseICalEvents(text, id, color, color);
        }
    } catch (e) {
        console.warn('corsproxy.io failed, trying alternative...', e);
    }

    // Strategy 3: allorigins.win
    try {
        console.log('Attempting allorigins.win...');
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetchWithTimeout(proxyUrl);
        if (response.ok) {
            const text = await response.text();
            return parseICalEvents(text, id, color, color);
        }
    } catch (e) {
        console.error('All fetch strategies failed', e);
        error = e;
    }

    // If we get here, all failed
    const errorMsg = error ? (error.message || JSON.stringify(error)) : 'Unknown error';
    console.error(`All fetch strategies failed. Last error: ${errorMsg}`);
    throw new Error(`Failed to add calendar. (Last Error: ${errorMsg})`);
}

export const calendarStore = createCalendarStore();
