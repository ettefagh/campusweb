import { get, writable } from "svelte/store";
import { browser } from "$app/environment";
import { loadCalendarEvents, type CalendarEvent } from "$lib/utils/icalParser";

export const cachedCalendarEvents = writable<CalendarEvent[]>([]);

const STORAGE_KEY = 'static_calendar_events_v1';

if (browser) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const hydrated = parsed.map((evt: any) => ({
        ...evt,
        start: new Date(evt.start),
        end: new Date(evt.end)
      }));
      cachedCalendarEvents.set(hydrated);
    } catch (e) {
      console.error("Failed to parse cached static calendar events", e);
    }
  }
}

let cachedAuthState: boolean | null = null;
let pendingLoad: Promise<CalendarEvent[]> | null = null;
let refreshedSubscriptionsThisSession = false;

export function hasCachedCalendarEvents(isVerified: boolean) {
  // If we hydrated from localStorage, we can consider it cached even before auth verification finishes
  if (get(cachedCalendarEvents).length > 0) return true;
  return cachedAuthState === isVerified;
}

export async function getCalendarEvents(isVerified: boolean, force = false) {
  if (!isVerified) return [];

  // Always return immediately if we already have hydrated data and aren't forcing a wait
  if (!force && get(cachedCalendarEvents).length > 0) {
    // Fire a background refresh if we haven't synced this session
    if (cachedAuthState !== isVerified && !pendingLoad) {
      pendingLoad = loadCalendarEvents(isVerified).then(events => {
        cachedAuthState = isVerified;
        cachedCalendarEvents.set(events);
        if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        return events;
      }).finally(() => { pendingLoad = null; });
    }
    return get(cachedCalendarEvents);
  }

  if (!force && pendingLoad) {
    return pendingLoad;
  }

  pendingLoad = loadCalendarEvents(isVerified)
    .then((events) => {
      cachedAuthState = isVerified;
      cachedCalendarEvents.set(events);
      if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      return events;
    })
    .finally(() => {
      pendingLoad = null;
    });

  return pendingLoad;
}

export function shouldRefreshSubscriptionsThisSession(force = false) {
  if (force) {
    refreshedSubscriptionsThisSession = true;
    return true;
  }

  if (refreshedSubscriptionsThisSession) return false;
  refreshedSubscriptionsThisSession = true;
  return true;
}
