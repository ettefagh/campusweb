import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getWeatherAlertPayload } from "$lib/server/weather";
import type { WeatherAlertResponse } from "$lib/types/weather";

function withRefreshStamp(value: WeatherAlertResponse): WeatherAlertResponse {
  return {
    ...value,
    lastRefreshedAt: value.lastRefreshedAt || value.fetchedAt
  };
}

async function persistWeatherStory(kv: any, payload: WeatherAlertResponse) {
  if (!kv?.put || !payload.story) return;

  try {
    await kv.put(
      "weather-story:latest",
      JSON.stringify({
        campusId: payload.selectedCampusId,
        fetchedAt: payload.fetchedAt,
        refreshedAt: payload.lastRefreshedAt || payload.fetchedAt,
        story: payload.story
      }),
      {
        expirationTtl: payload.refreshedInSeconds
      }
    );
  } catch {
    // Story persistence is best-effort only.
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

  const payload = await getWeatherAlertPayload(campusId, apiKey);
  if (!payload) {
    throw error(404, "Unknown campus");
  }

  const stamped = withRefreshStamp(payload);
  await persistWeatherStory(platform?.env?.STORIES_KV, stamped);

  return json(stamped, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
};
