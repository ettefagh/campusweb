import { CAMPUS_COORDS } from "$lib/data/campusCoords";
import { CAMPUSES, type Campus } from "$lib/stores/settingsStore";
import type {
  WeatherAlert,
  WeatherAlertResponse,
  WeatherCampusAlert,
  WeatherStory
} from "$lib/types/weather";

type OpenWeatherIndustry = {
  industry_name?: string;
  description?: string;
  severity?: string;
};

type OpenWeatherAlertItem = {
  alert_ID?: string;
  source?: string;
  title?: string;
  tag?: string | string[];
  certainty?: string;
  urgency?: string;
  location?: {
    type?: string;
    coordinates?: number[][] | number[][][];
  };
  date?: string;
  hour?: number;
  description?: string;
  industry?: OpenWeatherIndustry[];
};

type OpenWeatherAlertsResponse = {
  count?: number;
  items?: Array<{
    date?: string;
    hour?: number;
    alerts?: OpenWeatherAlertItem[];
  }>;
  alerts?: OpenWeatherAlertItem[];
};

type AlertEnvelope = OpenWeatherAlertItem & {
  fallbackDate?: string;
  fallbackHour?: number;
};

const ALERTS_ENDPOINT = "https://api.openweathermap.org/alerts/1.0";

function resolveCampusCoordinates(campus: Campus) {
  if (typeof campus.lat === "number" && typeof campus.lon === "number") {
    return { lat: campus.lat, lon: campus.lon };
  }

  const fallback = CAMPUS_COORDS[campus.id];
  if (fallback) return fallback;

  return null;
}

function buildLocationParam(lat: number, lon: number) {
  return encodeURIComponent(
    JSON.stringify({
      type: "Point",
      coordinates: [lon, lat]
    })
  );
}

function fetchJson<T>(url: string): Promise<T | null> {
  return fetch(url, {
    headers: {
      accept: "application/json"
    }
  })
    .then((response) => {
      if (!response.ok) return null;
      return response.json() as Promise<T>;
    })
    .catch(() => null);
}

function parseStartTime(item: AlertEnvelope) {
  if (item.date || item.fallbackDate) {
    const parsed = new Date(item.date || item.fallbackDate || "");
    if (!Number.isNaN(parsed.getTime())) {
      return Math.floor(parsed.getTime() / 1000);
    }
  }

  if (typeof item.fallbackHour === "number" && Number.isFinite(item.fallbackHour)) {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    date.setHours(item.fallbackHour);
    return Math.floor(date.getTime() / 1000);
  }

  return 0;
}

function normalizeAlertTags(tag: string | string[] | undefined, severity?: string) {
  const tags = Array.isArray(tag) ? tag : typeof tag === "string" && tag.trim() ? [tag.trim()] : [];

  if (severity && !tags.includes(severity)) {
    tags.push(severity);
  }

  return tags;
}

function normalizeAlertDescription(alert: OpenWeatherAlertItem) {
  const industryDescription = alert.industry
    ?.map((item) => item.description?.trim())
    .filter((value): value is string => Boolean(value));

  if (alert.description?.trim()) {
    return alert.description.trim();
  }

  if (industryDescription?.length) {
    return industryDescription.join("\n\n");
  }

  const meta: string[] = [];
  if (alert.certainty) meta.push(`Certainty: ${alert.certainty}`);
  if (alert.urgency) meta.push(`Urgency: ${alert.urgency}`);
  if (alert.tag) {
    const tagLabel = Array.isArray(alert.tag) ? alert.tag.join(", ") : alert.tag;
    meta.push(`Tag: ${tagLabel}`);
  }

  return meta.join(" · ");
}

function dedupeAlerts(alerts: WeatherAlert[]) {
  const seen = new Set<string>();

  return alerts.filter((alert) => {
    const key = [
      alert.alertId || "",
      alert.event,
      alert.start,
      alert.end,
      alert.senderName
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAlerts(response: OpenWeatherAlertsResponse | null): WeatherAlert[] {
  const items = response?.items ?? [];
  const rawAlerts: AlertEnvelope[] = [
    ...(Array.isArray(response?.alerts) ? response?.alerts : []).map((alert) => ({ ...alert })),
    ...items.flatMap((item) =>
      (Array.isArray(item.alerts) ? item.alerts : []).map((alert) => ({
        ...alert,
        fallbackDate: item.date,
        fallbackHour: item.hour
      }))
    )
  ];

  const alerts = rawAlerts.map((alert) => {
    const industry = Array.isArray(alert.industry) ? alert.industry : [];
    const severity = industry.find((item) => item.severity)?.severity?.trim();
    const certainty = alert.certainty?.trim();
    const urgency = alert.urgency?.trim();
    const event = alert.title?.trim() || alert.alert_ID?.trim() || "Weather alert";
    const start = parseStartTime(alert);

    return {
      senderName: alert.source?.trim() || "OpenWeather",
      event,
      start,
      end: 0,
      description: normalizeAlertDescription(alert),
      tags: normalizeAlertTags(alert.tag, severity),
      source: alert.source?.trim(),
      severity,
      certainty,
      urgency,
      alertId: alert.alert_ID?.trim()
    };
  });

  return dedupeAlerts(alerts).filter((alert) => alert.event.length > 0);
}

function chooseRefreshWindow(campuses: WeatherCampusAlert[]): number {
  return campuses.some((campus) => campus.alertCount > 0) ? 180 : 900;
}

function buildStory(campuses: WeatherCampusAlert[], fetchedAt: string): WeatherStory {
  const activeCampuses = campuses.filter((campus) => campus.alertCount > 0);
  const totalAlertCount = campuses.reduce((sum, campus) => sum + campus.alertCount, 0);
  const topCampuses = [...activeCampuses]
    .sort((left, right) => right.alertCount - left.alertCount || left.campusName.localeCompare(right.campusName))
    .slice(0, 3)
    .map((campus) => ({
      campusId: campus.campusId,
      campusName: campus.campusName,
      alertCount: campus.alertCount
    }));

  const summary = activeCampuses.length
    ? `${activeCampuses.length} campus${activeCampuses.length === 1 ? "" : "es"} currently ha${activeCampuses.length === 1 ? "s" : "ve"} ${totalAlertCount} active weather alert${totalAlertCount === 1 ? "" : "s"}.`
    : "No active weather alerts across the campus network right now.";

  return {
    title: "Campus weather story",
    summary,
    generatedAt: fetchedAt,
    activeCampusCount: activeCampuses.length,
    totalAlertCount,
    topCampuses
  };
}

async function fetchCampusAlerts(campus: Campus, apiKey: string): Promise<WeatherCampusAlert> {
  const coordinates = resolveCampusCoordinates(campus);
  const fetchedAt = new Date().toISOString();

  if (!coordinates) {
    return {
      campusId: campus.id,
      campusName: campus.name,
      city: campus.city,
      country: campus.country,
      latitude: 0,
      longitude: 0,
      fetchedAt,
      alerts: [],
      alertCount: 0,
      source: "openweather"
    };
  }

  const url =
    `${ALERTS_ENDPOINT}?location=${buildLocationParam(coordinates.lat, coordinates.lon)}` +
    `&appid=${encodeURIComponent(apiKey)}`;

  const response = await fetchJson<OpenWeatherAlertsResponse>(url);
  const alerts = normalizeAlerts(response);

  return {
    campusId: campus.id,
    campusName: campus.name,
    city: campus.city,
    country: campus.country,
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    fetchedAt,
    alerts,
    alertCount: alerts.length,
    source: "openweather"
  };
}

function getCampusContext(campusId: string) {
  const campus = CAMPUSES.find((entry) => entry.id === campusId) ?? null;
  return campus;
}

export async function getWeatherAlertPayload(
  campusId: string,
  apiKey: string
): Promise<WeatherAlertResponse | null> {
  const selectedCampus = getCampusContext(campusId);
  if (!selectedCampus) return null;

  const campuses = await Promise.all(CAMPUSES.map((campus) => fetchCampusAlerts(campus, apiKey)));
  const selectedCampusResult =
    campuses.find((entry) => entry.campusId === selectedCampus.id) ?? campuses[0];

  const selectedAlerts = selectedCampusResult?.alerts ?? [];
  const fetchedAt = new Date().toISOString();
  const story = buildStory(campuses, fetchedAt);

  return {
    selectedCampusId: selectedCampus.id,
    campusId: selectedCampus.id,
    campusName: selectedCampus.name,
    city: selectedCampus.city,
    country: selectedCampus.country,
    latitude: selectedCampusResult?.latitude ?? selectedCampus.lat,
    longitude: selectedCampusResult?.longitude ?? selectedCampus.lon,
    lastRefreshedAt: fetchedAt,
    fetchedAt,
    refreshedInSeconds: chooseRefreshWindow(campuses),
    alerts: selectedAlerts,
    campuses,
    activeCampusCount: story.activeCampusCount,
    totalAlertCount: story.totalAlertCount,
    story,
    source: "openweather"
  };
}
