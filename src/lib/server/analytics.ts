type AnalyticsEngineDatasetLike = {
  writeDataPoint: (data: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }) => void | Promise<void>;
};

export type UsageEventType =
  | "app_open"
  | "standalone_launch"
  | "pwa_installed"
  | "share_open"
  | "share_native"
  | "share_copy"
  | "share_qr_view"
  | "share_link_visit";

const ALLOWED_EVENT_TYPES: Set<UsageEventType> = new Set([
  "app_open",
  "standalone_launch",
  "pwa_installed",
  "share_open",
  "share_native",
  "share_copy",
  "share_qr_view",
  "share_link_visit"
]);

export function isAllowedUsageEventType(value: string): value is UsageEventType {
  return ALLOWED_EVENT_TYPES.has(value as UsageEventType);
}

function trimOrFallback(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export async function writeUsageEvent(
  dataset: AnalyticsEngineDatasetLike | undefined,
  input: {
    eventType: UsageEventType;
    surface?: string;
    displayMode?: string;
    appVersion?: string;
  }
) {
  if (!dataset) return;

  const eventType = trimOrFallback(input.eventType, "unknown");
  const surface = trimOrFallback(input.surface, "unknown");
  const displayMode = trimOrFallback(input.displayMode, "unknown");
  const appVersion = trimOrFallback(input.appVersion, "unknown");

  await dataset.writeDataPoint({
    blobs: [eventType, surface, displayMode, appVersion],
    doubles: [1]
  });
}

export async function queryUsageSummary(opts: {
  accountId?: string;
  apiToken?: string;
  dataset?: string;
  days?: number;
}) {
  const accountId = (opts.accountId || "").trim();
  const apiToken = (opts.apiToken || "").trim();
  const dataset = (opts.dataset || "campusweb_usage_events").trim();
  const days = Number.isFinite(opts.days) ? Math.min(Math.max(Number(opts.days), 1), 90) : 30;

  if (!accountId || !apiToken) return null;

  const query = `SELECT blob1 AS event_type, SUM(_sample_interval) AS count
FROM ${dataset}
WHERE timestamp >= NOW() - INTERVAL '${days}' DAY
GROUP BY event_type
ORDER BY count DESC`;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "text/plain"
      },
      body: query
    }
  );

  if (!response.ok) return null;

  const payload = await response.json().catch(() => null);
  const rows = Array.isArray(payload?.result) ? payload.result : [];
  if (rows.length === 0) return [];

  return rows
    .map((row: any) => ({
      eventType: String(row?.event_type || ""),
      count: Number(row?.count || 0)
    }))
    .filter((row: { eventType: string; count: number }) => row.eventType && Number.isFinite(row.count));
}
