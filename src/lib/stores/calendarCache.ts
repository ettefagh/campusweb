import { get, writable } from "svelte/store";
import { loadCalendarEvents, type CalendarEvent } from "$lib/utils/icalParser";

export const cachedCalendarEvents = writable<CalendarEvent[]>([]);

let cachedAuthState: boolean | null = null;
let pendingLoad: Promise<CalendarEvent[]> | null = null;
let refreshedSubscriptionsThisSession = false;

export function hasCachedCalendarEvents(isVerified: boolean) {
  return cachedAuthState === isVerified;
}

export async function getCalendarEvents(isVerified: boolean, force = false) {
  if (!force && hasCachedCalendarEvents(isVerified)) {
    return get(cachedCalendarEvents);
  }

  if (!force && pendingLoad) {
    return pendingLoad;
  }

  pendingLoad = loadCalendarEvents(isVerified)
    .then((events) => {
      cachedAuthState = isVerified;
      cachedCalendarEvents.set(events);
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
