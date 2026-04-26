import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { CalendarEvent } from '$lib/utils/icalParser';
import { parseICalEvents, extractCalendarName } from '$lib/utils/icalParser';

export interface CalendarSubscription {
    id: string;
    url: string;
    name: string;
    color: string;
    texture?: string;
    lastUpdated: number;
    cachedEvents: CalendarEvent[];
}

export const EVENT_COLORS = [
    { id: 'var(--event-srh)', texture: 'stripes' },
    { id: 'var(--event-green)', texture: 'dots' },
    { id: 'var(--event-orange)', texture: 'mesh' },
    { id: 'var(--event-purple)', texture: 'stripes' },
    { id: 'var(--event-pink)', texture: 'dots' },
    { id: 'var(--event-cyan)', texture: 'mesh' },
    { id: 'var(--event-yellow)', texture: 'stripes' },
    { id: 'var(--event-lecture-free)', texture: 'dots' },
    { id: 'var(--event-exams)', texture: 'mesh' }
];

export function getTextureForColor(color: string): string {
    const found = EVENT_COLORS.find(c => c.id === color);
    return found ? found.texture : 'solid';
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
                const available = EVENT_COLORS.find(c => !usedColors.includes(c.id));
                color = available ? available.id : EVENT_COLORS[subs.length % EVENT_COLORS.length].id;
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
                        texture: getTextureForColor(color),
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
            // Read current state without nesting update() calls
            let currentSubs: CalendarSubscription[] = [];
            const unsub = subscribe(subs => { currentSubs = subs; });
            unsub();

            const subsToRefresh = currentSubs.filter(
                sub => force || (now - sub.lastUpdated > UPDATE_INTERVAL)
            );

            await Promise.all(subsToRefresh.map(async (sub) => {
                try {
                    const result = await fetchCalendarEvents(sub.url, sub.id, sub.color);
                    update(subs =>
                        subs.map(s =>
                            s.id === sub.id
                                ? { ...s, lastUpdated: Date.now(), cachedEvents: result.events, name: result.name || s.name }
                                : s
                        )
                    );
                } catch (e) {
                    console.error(`Failed to refresh calendar ${sub.name}:`, e);
                }
            }));
        },

        // Alias used by the calendar page (supports explicit color)
        addSubscription: async (url: string, name: string = 'My Calendar', color?: string) => {
            const id = crypto.randomUUID();
            const resolvedColor = color || 'var(--event-srh)';

            try {
                const result = await fetchCalendarEvents(url, id, resolvedColor);
                update(subs => {
                    return [...subs, {
                        id,
                        url,
                        name: result.name || name,
                        color: resolvedColor,
                        texture: getTextureForColor(resolvedColor),
                        lastUpdated: Date.now(),
                        cachedEvents: result.events
                    }];
                });
                return true;
            } catch (e) {
                console.error('Failed to add calendar subscription:', e);
                return false;
            }
        },

        updateSubscriptionColor: (id: string, newColor: string) => {
            update(subs => {
                return subs.map(sub => {
                    if (sub.id === id) {
                        const updatedEvents = sub.cachedEvents.map(evt => ({
                            ...evt,
                            backgroundColor: newColor
                        }));
                        return { 
                            ...sub, 
                            color: newColor, 
                            texture: getTextureForColor(newColor),
                            cachedEvents: updatedEvents 
                        };
                    }
                    return sub;
                });
            });
        }
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
        const timestamp = Date.now();
        const proxyUrl = `/api/ical-proxy?url=${encodeURIComponent(url)}&t=${timestamp}`;
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
