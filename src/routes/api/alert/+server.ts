import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform }) => {
  const kv = platform?.env?.STORIES_KV;
  if (kv) {
    try {
      const raw = await kv.get("campus_alert");
      if (raw) {
        const alertData = JSON.parse(raw);
        if (new Date(alertData.expiresAt) > new Date()) {
          return json({ text: alertData.text });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch alert from KV:", err);
    }
  }
  return json({ text: null });
};
