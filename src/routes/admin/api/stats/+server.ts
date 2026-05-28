import { json } from "@sveltejs/kit";

export async function GET({ platform }) {
  const kv = platform?.env?.STORIES_KV;
  if (!kv) {
    // If KV not bound (local dev), return structured mock stats so the local dashboard looks gorgeous and works!
    return json({
      suggestions: {
        allTime: 128,
        daily: { "2026-05-28": 12, "2026-05-27": 15, "2026-05-26": 8 },
        monthly: { "2026-05": 128 }
      },
      fields: { hasExpiry: 84, hasUrl: 96 },
      actions: { approved: 92, declined: 24, edited: 10, directCreated: 2 },
      links: {
        allTime: {
          "srh-portal": 412,
          "ecampus": 284,
          "library": 195,
          "canteen": 156,
          "railmap": 94
        },
        daily: {
          "2026-05-28": { "srh-portal": 24, "ecampus": 18, "library": 9 },
          "2026-05-27": { "srh-portal": 32, "ecampus": 22, "library": 12 }
        }
      },
      storyViews: {
        allTime: {
          "story-welcome": 1205,
          "story-party": 842,
          "story-exams": 612,
          "story-weather": 482
        },
        daily: {
          "2026-05-28": { "story-welcome": 45, "story-party": 38 },
          "2026-05-27": { "story-welcome": 52, "story-party": 42 }
        }
      }
    });
  }

  try {
    const raw = await kv.get("bot_stats");
    const stats = raw ? JSON.parse(raw) : {
      suggestions: { allTime: 0, daily: {}, monthly: {} },
      fields: { hasExpiry: 0, hasUrl: 0 },
      actions: { approved: 0, declined: 0, edited: 0, directCreated: 0 },
      links: { allTime: {}, daily: {} },
      storyViews: { allTime: {}, daily: {} }
    };
    return json(stats);
  } catch (err: any) {
    console.error("Failed to fetch stats in admin API:", err);
    return json({ error: err.message }, { status: 500 });
  }
}
