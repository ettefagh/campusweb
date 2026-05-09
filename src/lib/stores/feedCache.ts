import { writable } from "svelte/store";
import type { Story } from "$lib/components/StoriesSlider.svelte";
import storiesJson from "$lib/data/stories.json";

// Persistence during user session inside application
export const cachedStories = writable<Story[]>(storiesJson as Story[]);
export const lastFetchTime = writable<number>(0);

const REFRESH_RATE_MS = 5 * 60 * 1000; // 5 Minute Cache Window

export async function getStories(force = false) {
  let lastTime = 0;
  lastFetchTime.subscribe(v => lastTime = v)();

  // Check if enough time passed or if this is forced refresh
  if (!force && Date.now() - lastTime < REFRESH_RATE_MS) {
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
