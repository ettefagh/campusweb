type BotStats = {
  suggestions: {
    allTime: number;
    daily: Record<string, number>;
    monthly: Record<string, number>;
  };
  fields: {
    hasExpiry: number;
    hasUrl: number;
  };
  actions: {
    approved: number;
    declined: number;
    edited: number;
    directCreated: number;
  };
  links: {
    allTime: Record<string, number>;
    daily: Record<string, Record<string, number>>;
  };
};

function createDefaultStats(): BotStats {
  return {
    suggestions: { allTime: 0, daily: {}, monthly: {} },
    fields: { hasExpiry: 0, hasUrl: 0 },
    actions: { approved: 0, declined: 0, edited: 0, directCreated: 0 },
    links: { allTime: {}, daily: {} }
  };
}

async function readStats(kv: any): Promise<BotStats> {
  const stats = createDefaultStats();
  const raw = await kv.get("bot_stats");

  if (!raw) return stats;

  try {
    const parsed = JSON.parse(raw);
    return {
      suggestions: { ...stats.suggestions, ...parsed.suggestions },
      fields: { ...stats.fields, ...parsed.fields },
      actions: { ...stats.actions, ...parsed.actions },
      links: {
        allTime: { ...stats.links.allTime, ...parsed.links?.allTime },
        daily: { ...stats.links.daily, ...parsed.links?.daily }
      }
    };
  } catch (e) {
    return stats;
  }
}

export async function incrementStat(kv: any, type: "suggestions" | "actions" | "fields", subtype: string) {
  if (!kv) return;

  try {
    const stats = await readStats(kv);

    const now = new Date();
    const dailyKey = now.toISOString().split("T")[0];
    const monthlyKey = dailyKey.substring(0, 7);

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

export async function incrementLinkClick(kv: any, linkId: string) {
  if (!kv || !linkId) return;

  try {
    const stats = await readStats(kv);
    const today = new Date().toISOString().split("T")[0];

    stats.links.allTime[linkId] = (stats.links.allTime[linkId] || 0) + 1;
    stats.links.daily[today] = stats.links.daily[today] || {};
    stats.links.daily[today][linkId] = (stats.links.daily[today][linkId] || 0) + 1;

    await kv.put("bot_stats", JSON.stringify(stats));
  } catch (err) {
    console.error("Failed to update link stats", err);
  }
}
