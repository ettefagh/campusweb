import { json } from "@sveltejs/kit";
import { incrementStoryView } from "$lib/server/stats";

export async function POST({ request, platform }) {
  try {
    const body = await request.json();
    const storyId = typeof body?.storyId === "string" ? body.storyId.trim() : "";

    if (!storyId.startsWith("story-")) {
      return json({ error: "Unknown story" }, { status: 400 });
    }

    const kv = platform?.env?.STORIES_KV;
    if (kv) {
      await incrementStoryView(kv, storyId);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
