import { json } from "@sveltejs/kit";
import { isAllowedUsageEventType, writeUsageEvent } from "$lib/server/analytics";

const ALLOWED_SURFACES = new Set(["layout", "settings_share"]);
const ALLOWED_DISPLAY_MODES = new Set(["browser", "standalone", "fullscreen", "minimal-ui"]);

export async function POST({ request, platform }) {
  try {
    const body = await request.json();
    const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";
    const surface = typeof body?.surface === "string" ? body.surface.trim() : "unknown";
    const displayMode = typeof body?.displayMode === "string" ? body.displayMode.trim() : "unknown";
    const appVersion = typeof body?.appVersion === "string" ? body.appVersion.trim() : "unknown";

    if (!isAllowedUsageEventType(eventType)) {
      return json({ error: "Invalid event type" }, { status: 400 });
    }

    await writeUsageEvent(platform?.env?.CAMPUS_ANALYTICS, {
      eventType,
      surface: ALLOWED_SURFACES.has(surface) ? surface : "unknown",
      displayMode: ALLOWED_DISPLAY_MODES.has(displayMode) ? displayMode : "unknown",
      appVersion
    });

    return json({ success: true });
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
