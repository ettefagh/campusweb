import { writable } from "svelte/store";
import type { SocialAccount } from "$lib/data/socialAccounts";

export const dynamicClubs = writable<SocialAccount[]>([]);
export const lastClubFetchTime = writable<number>(0);

export async function fetchClubs(force = false) {
  let lastTime = 0;
  lastClubFetchTime.subscribe(v => lastTime = v)();

  // Refresh every 5 minutes by default
  const refreshRateMs = 5 * 60 * 1000;
  
  if (!force && Date.now() - lastTime < refreshRateMs) {
    return;
  }

  try {
    const res = await fetch("/api/clubs");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data)) {
        dynamicClubs.set(data);
        lastClubFetchTime.set(Date.now());
      }
    }
  } catch (e) {
    console.warn("Dynamic clubs fetch failed; continuing with previous data.");
  }
}
