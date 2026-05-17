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
  storyViews: {
    allTime: Record<string, number>;
    daily: Record<string, Record<string, number>>;
  };
};

function createDefaultStats(): BotStats {
  return {
    suggestions: { allTime: 0, daily: {}, monthly: {} },
    fields: { hasExpiry: 0, hasUrl: 0 },
    actions: { approved: 0, declined: 0, edited: 0, directCreated: 0 },
    links: { allTime: {}, daily: {} },
    storyViews: { allTime: {}, daily: {} }
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
      },
      storyViews: {
        allTime: { ...stats.storyViews.allTime, ...parsed.storyViews?.allTime },
        daily: { ...stats.storyViews.daily, ...parsed.storyViews?.daily }
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

export async function getPopularLinkStats(kv: any, limit = 10, knownLinkIds?: Set<string>) {
  if (!kv) return [];

  try {
    const stats = await readStats(kv);
    const today = new Date().toISOString().split("T")[0];
    const todayLinks = stats.links.daily[today] || {};

    return Object.entries(stats.links.allTime)
      .map(([linkId, total]) => ({
        linkId,
        total: Number(total) || 0,
        today: Number(todayLinks[linkId]) || 0
      }))
      .filter((item) => (!knownLinkIds || knownLinkIds.has(item.linkId)) && item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  } catch (err) {
    console.error("Failed to read popular link stats", err);
    return [];
  }
}

export async function incrementStoryView(kv: any, storyId: string) {
  if (!kv || !storyId) return;

  try {
    const stats = await readStats(kv);
    const today = new Date().toISOString().split("T")[0];

    stats.storyViews.allTime[storyId] = (stats.storyViews.allTime[storyId] || 0) + 1;
    stats.storyViews.daily[today] = stats.storyViews.daily[today] || {};
    stats.storyViews.daily[today][storyId] = (stats.storyViews.daily[today][storyId] || 0) + 1;

    await kv.put("bot_stats", JSON.stringify(stats));
  } catch (err) {
    console.error("Failed to update story stats", err);
  }
}
