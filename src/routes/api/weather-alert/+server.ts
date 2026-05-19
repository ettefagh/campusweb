import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getWeatherAlertPayload } from "$lib/server/weather";
import type { WeatherAlertResponse } from "$lib/types/weather";

const CACHE_PREFIX = "weather-alert:";

function withRefreshStamp(value: WeatherAlertResponse): WeatherAlertResponse {
  return {
    ...value,
    lastRefreshedAt: value.lastRefreshedAt || value.fetchedAt
  };
}

async function readCachedWeatherAlert(kv: any, key: string) {
  if (!kv) return null;

  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    return withRefreshStamp(JSON.parse(raw) as WeatherAlertResponse);
  } catch {
    return null;
  }
}

async function writeCachedWeatherAlert(
  kv: any,
  key: string,
  value: WeatherAlertResponse
) {
  if (!kv) return;

  try {
    await kv.put(key, JSON.stringify(value), {
      expirationTtl: value.refreshedInSeconds
    });
  } catch {
    // Ignore cache write failures and serve the fresh response instead.
  }
}

export const GET: RequestHandler = async ({ platform, url }) => {
  const campusId = url.searchParams.get("campusId")?.trim();
  if (!campusId) {
    throw error(400, "Missing campusId");
  }

  const apiKey = (platform?.env as any)?.PRIVATE_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw error(500, "OpenWeather API key is not configured");
  }

  const kv = platform?.env?.STORIES_KV;
  const cacheKey = `${CACHE_PREFIX}${campusId}`;
  const cached = await readCachedWeatherAlert(kv, cacheKey);
  if (cached) {
    return json(cached, {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600"
      }
    });
  }

  const payload = await getWeatherAlertPayload(campusId, apiKey);
  if (!payload) {
    throw error(404, "Unknown campus");
  }

  const stamped = withRefreshStamp(payload);
  await writeCachedWeatherAlert(kv, cacheKey, stamped);

  return json(stamped, {
    headers: {
      "Cache-Control": "public, max-age=120, stale-while-revalidate=600"
    }
  });
};
