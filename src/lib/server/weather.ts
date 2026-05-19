import { CAMPUSES } from "$lib/stores/settingsStore";
import type { WeatherAlert, WeatherAlertResponse } from "$lib/types/weather";

type OpenWeatherGeoResult = {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
};

type OpenWeatherAlert = {
  sender_name?: string;
  event?: string;
  start?: number;
  end?: number;
  description?: string;
  tags?: string[];
};

type OpenWeatherOneCallResponse = {
  alerts?: OpenWeatherAlert[];
};

function getCampusContext(campusId: string) {
  const campus = CAMPUSES.find((entry) => entry.id === campusId) ?? null;
  if (!campus) return null;

  return {
    campus,
    query: campus.weatherLocation || [campus.city, campus.country].filter(Boolean).join(",")
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

function normalizeAlerts(alerts: OpenWeatherAlert[] = []): WeatherAlert[] {
  return alerts
    .map((alert) => ({
      senderName: alert.sender_name?.trim() || "OpenWeather",
      event: alert.event?.trim() || "Weather alert",
      start: Number(alert.start) || 0,
      end: Number(alert.end) || 0,
      description: alert.description?.trim() || "",
      tags: Array.isArray(alert.tags) ? alert.tags : []
    }))
    .filter((alert) => alert.event.length > 0);
}

function chooseRefreshWindow(alerts: WeatherAlert[]): number {
  return alerts.length > 0 ? 180 : 900;
}

export async function getWeatherAlertPayload(
  campusId: string,
  apiKey: string
): Promise<WeatherAlertResponse | null> {
  const context = getCampusContext(campusId);
  if (!context) return null;

  try {
    const geocodeUrl =
      `https://api.openweathermap.org/geo/1.0/direct?q=` +
      `${encodeURIComponent(context.query)}&limit=1&appid=${encodeURIComponent(apiKey)}`;

    const geoResults = await fetchJson<OpenWeatherGeoResult[]>(geocodeUrl);
    const location = geoResults?.[0];

    if (!location) {
      return {
        campusId,
        campusName: context.campus.name,
        city: context.campus.city,
        country: context.campus.country,
        lastRefreshedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        refreshedInSeconds: 900,
        alerts: [],
        source: "openweather"
      };
    }

    const oneCallUrl =
      `https://api.openweathermap.org/data/3.0/onecall?lat=${location.lat}&lon=${location.lon}` +
      `&exclude=current,minutely,hourly,daily&units=metric&appid=${encodeURIComponent(apiKey)}`;

    const weather = await fetchJson<OpenWeatherOneCallResponse>(oneCallUrl);
    const alerts = normalizeAlerts(weather?.alerts);

    return {
      campusId,
      campusName: context.campus.name,
      city: context.campus.city,
      country: context.campus.country,
      lastRefreshedAt: new Date().toISOString(),
      resolvedLocation: {
        name: location.name,
        country: location.country,
        state: location.state,
        lat: location.lat,
        lon: location.lon
      },
      fetchedAt: new Date().toISOString(),
      refreshedInSeconds: chooseRefreshWindow(alerts),
      alerts,
      source: "openweather"
    };
  } catch {
    return {
      campusId,
      campusName: context.campus.name,
      city: context.campus.city,
      country: context.campus.country,
      lastRefreshedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      refreshedInSeconds: 900,
      alerts: [],
      source: "openweather"
    };
  }
}
