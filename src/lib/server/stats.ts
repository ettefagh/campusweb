export async function incrementStat(kv: any, type: "suggestions" | "actions" | "fields", subtype: string) {
  if (!kv) return;

  try {
    let stats = {
      suggestions: { allTime: 0, daily: {} as Record<string, number>, monthly: {} as Record<string, number> },
      fields: { hasExpiry: 0, hasUrl: 0 },
      actions: { approved: 0, declined: 0, edited: 0, directCreated: 0 }
    };

    const raw = await kv.get("bot_stats");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Deep merge to preserve structure
        stats = {
          suggestions: { ...stats.suggestions, ...parsed.suggestions },
          fields: { ...stats.fields, ...parsed.fields },
          actions: { ...stats.actions, ...parsed.actions }
        };
      } catch (e) {}
    }

    const now = new Date();
    const dailyKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const monthlyKey = dailyKey.substring(0, 7); // YYYY-MM

    if (type === "suggestions" && subtype === "new") {
      stats.suggestions.allTime++;
      stats.suggestions.daily[dailyKey] = (stats.suggestions.daily[dailyKey] || 0) + 1;
      stats.suggestions.monthly[monthlyKey] = (stats.suggestions.monthly[monthlyKey] || 0) + 1;
    } else if (type === "fields") {
      if (subtype === "hasExpiry") stats.fields.hasExpiry++;
      if (subtype === "hasUrl") stats.fields.hasUrl++;
    } else if (type === "actions") {
      if (subtype === "approved") stats.actions.approved++;
      if (subtype === "declined") stats.actions.declined++;
      if (subtype === "edited") stats.actions.edited++;
      if (subtype === "directCreated") stats.actions.directCreated++;
    }

    await kv.put("bot_stats", JSON.stringify(stats));
  } catch (err) {
    console.error("Failed to update stats", err);
  }
}
