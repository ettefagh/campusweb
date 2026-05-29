import { writable } from "svelte/store";
import type { Promotion } from "$lib/data/promotions";

export const dynamicPromotions = writable<Promotion[]>([]);
export const lastPromoFetchTime = writable<number>(0);

export async function fetchPromotions(force = false) {
  let lastTime = 0;
  lastPromoFetchTime.subscribe(v => lastTime = v)();

  // Refresh every 5 minutes by default
  const refreshRateMs = 5 * 60 * 1000;
  
  if (!force && Date.now() - lastTime < refreshRateMs) {
    return;
  }

  try {
    const res = await fetch("/api/promotions");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data)) {
        dynamicPromotions.set(data);
        lastPromoFetchTime.set(Date.now());
      }
    }
  } catch (e) {
    console.warn("Dynamic promotions fetch failed; continuing with previous data.");
  }
}
