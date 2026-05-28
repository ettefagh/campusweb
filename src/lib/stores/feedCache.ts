import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import type { Story } from "$lib/components/StoriesSlider.svelte";
import storiesJson from "$lib/data/stories.json";
import { settingsStore } from "$lib/stores/settingsStore";

// Persistence during user session inside application
export const cachedStories = writable<Story[]>([]);
export const lastFetchTime = writable<number>(0);
export const storiesLoading = writable<boolean>(false);

const STORIES_STORAGE_KEY = 'cached_stories_v1';

if (browser) {
  const stored = localStorage.getItem(STORIES_STORAGE_KEY);
  if (stored) {
    try {
      cachedStories.set(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to parse cached stories", e);
    }
  }
}

let stageStoriesRun = 0;

function stageStories(stories: Story[]) {
  const runId = ++stageStoriesRun;
  const firstBatch = stories.slice(0, 3);
  const remaining = stories.slice(3);

  cachedStories.set(firstBatch);
  storiesLoading.set(remaining.length > 0 ? true : false);

  if (remaining.length === 0) {
    lastFetchTime.set(Date.now());
    return;
  }

  let offset = 0;
  const appendChunk = () => {
    if (runId !== stageStoriesRun) return;

    const chunk = remaining.slice(offset, offset + 6);
    if (chunk.length === 0) {
      storiesLoading.set(false);
      lastFetchTime.set(Date.now());
      return;
    }

    cachedStories.update((current) => [...current, ...chunk]);
    offset += 6;
    setTimeout(appendChunk, 140);
  };

  setTimeout(appendChunk, 120);
}

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
    if (get(cachedStories).length === 0) {
      storiesLoading.set(true);
    }

    const res = await fetch("/api/stories");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data)) {
        if (browser) {
          localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(data));
        }
        stageStories(data);
        return;
      }
    }
  } catch (e) {
    console.warn("Stories fetch failed; continuing with previous data.");
  }

  if (get(cachedStories).length === 0) {
    cachedStories.set(storiesJson as Story[]);
  }
  storiesLoading.set(false);
}

