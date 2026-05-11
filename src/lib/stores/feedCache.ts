import { writable, get } from "svelte/store";
import type { Story } from "$lib/components/StoriesSlider.svelte";
import storiesJson from "$lib/data/stories.json";
import { settingsStore } from "$lib/stores/settingsStore";

// Persistence during user session inside application
export const cachedStories = writable<Story[]>(storiesJson as Story[]);
export const lastFetchTime = writable<number>(0);

export async function getStories(force = false) {
  const settings = get(settingsStore);
  const rateInMinutes = settings.feedRefreshRate ?? 5;
  const refreshRateMs = rateInMinutes * 60 * 1000;
  
  let lastTime = 0;
  lastFetchTime.subscribe(v => lastTime = v)();

  // If manual (0) and not forced, skip
  if (rateInMinutes === 0 && !force) return;

  // Check if enough time passed or if this is forced refresh
  if (!force && rateInMinutes > 0 && Date.now() - lastTime < refreshRateMs) {
    return; 
  }

  try {
    const res = await fetch("/api/stories");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data)) {
        cachedStories.set(data);
        lastFetchTime.set(Date.now());
      }
    }
  } catch (e) {
    console.warn("Stories fetch failed; continuing with previous data.");
  }
}
