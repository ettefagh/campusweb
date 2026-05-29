import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getPopularLinkStats, incrementStat } from "$lib/server/stats";
import { queryUsageSummary } from "$lib/server/analytics";
import { sendClubApprovalEmail, sendStoryApprovalEmail, type EmailSendResult } from "$lib/server/email";
import { allLinks } from "$lib/data/links";

function parseExpiration(expiresParsed: string): string {
  let finalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (expiresParsed) {
    const p = expiresParsed.toLowerCase().trim();
    if (p.startsWith('+') && p.endsWith('d')) {
      const days = parseInt(p.replace('+','').replace('d',''));
      if (!isNaN(days)) finalExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    } else if (p.startsWith('+') && p.endsWith('w')) {
      const weeks = parseInt(p.replace('+','').replace('w',''));
      if (!isNaN(weeks)) finalExpiresAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      const parts = expiresParsed.split('/');
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) finalExpiresAt = d.toISOString();
      }
    }
  }
  return finalExpiresAt;
}

function extractEmailFromText(text: string): string {
  const contactMatch = text.match(/Contact:\s*([^\s<>\n]+@[^\s<>\n]+)/i);
  if (contactMatch?.[1]) return contactMatch[1].trim();

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch?.[0]?.trim() || "";
}

function extractBlockField(text: string, field: string): string {
  const pattern = new RegExp(
    `(?:^|\\n)${field}:\\s*([\\s\\S]*?)(?=\\n(?:Title|Subtitle|Tag|Link|Expires|Contact):|$)`,
    "i"
  );
  const match = text.match(pattern);
  return match?.[1]?.trim() || "";
}

function extractFirstMatchingBlockField(text: string, fields: string[]) {
  for (const field of fields) {
    const value = extractBlockField(text, field);
    if (value) return value;
  }
  return "";
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeStoryText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapStoryPreview(text: string, maxLines = 3, maxCharsPerLine = 56) {
  const normalized = normalizeStoryText(text);
  if (!normalized) return "";

  const sourceLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const wrapped: string[] = [];

  for (const line of sourceLines) {
    const words = line.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxCharsPerLine) {
        current = next;
      } else {
        if (current) wrapped.push(current);
        current = word;
      }

      if (wrapped.length >= maxLines) break;
    }

    if (wrapped.length >= maxLines) break;
    if (current) wrapped.push(current);
    if (wrapped.length >= maxLines) break;
  }

  const truncated = wrapped.slice(0, maxLines);
  const consumedText = truncated.join(" ");
  const shouldEllipsize = normalized.length > consumedText.length;
  if (shouldEllipsize && truncated.length > 0) {
    truncated[truncated.length - 1] = `${truncated[truncated.length - 1].replace(/[.…. ]+$/g, "")} ...`;
  }

  return truncated.join("\n");
}

function storyViewsLabel(count: number) {
  return `${count} ${count === 1 ? "view" : "views"}`;
}

function limitWords(text: string, maxWords = 15) {
  const words = normalizeStoryText(text)
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")} ...`;
}

function hashStoryId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 10000;
  }
  return hash;
}

function assignStoryShortIds<T extends { id: string }>(stories: T[]) {
  const used = new Set<string>();
  const byStoryId = new Map<string, string>();

  for (const story of stories) {
    let candidate = hashStoryId(story.id);
    for (let attempts = 0; attempts < 10000; attempts += 1) {
      const sid = String(candidate).padStart(4, "0");
      if (!used.has(sid)) {
        used.add(sid);
        byStoryId.set(story.id, sid);
        break;
      }
      candidate = (candidate + 1) % 10000;
    }
  }

  return byStoryId;
}

function assignShortIds<T extends { id: string }>(items: T[]) {
  return assignStoryShortIds(items);
}

function chunkButtons<T>(buttons: T[], size = 2) {
  const rows: T[][] = [];
  for (let index = 0; index < buttons.length; index += size) {
    rows.push(buttons.slice(index, index + size));
  }
  return rows;
}

function formatStoryListTitle(title: string, sid: string) {
  return `<b>${escapeTelegramHtml(title || "Untitled")}</b>\n/sid${sid}`;
}

function formatStoryListPreview(story: any) {
  const preview = limitWords(story.subtitle || "", 15);
  if (!preview) return "";
  return `\n<blockquote>${escapeTelegramHtml(preview)}</blockquote>`;
}

function formatStoryListItem(story: any, index: number, sid: string) {
  const titleBlock = formatStoryListTitle(story.title || "Untitled", sid);
  const previewBlock = formatStoryListPreview(story);
  const viewsBlock = `\n• ${storyViewsLabel(Number(story.viewCount) || 0)}`;
  return `${index + 1}. ${titleBlock}${previewBlock}${viewsBlock}`;
}

function formatStoryDetailsText(story: any, sid: string) {
  const parts = [
    `📖 <b>${escapeTelegramHtml(story.title || "Untitled")}</b>`,
    `/sid${sid}`
  ];

  if (story.subtitle) {
    parts.push(`\n${escapeTelegramHtml(normalizeStoryText(story.subtitle))}`);
  }

  if (story.tag) {
    parts.push(`\n🏷 ${escapeTelegramHtml(story.tag)}`);
  }

  if (story.linkUrl) {
    parts.push(`\n🔗 ${escapeTelegramHtml(story.linkUrl)}`);
  }

  if (story.expiresAt) {
    parts.push(`\n⏳ Expires: ${escapeTelegramHtml(new Date(story.expiresAt).toLocaleDateString())}`);
  }

  if (typeof story.viewCount !== "undefined") {
    parts.push(`\n👁 ${storyViewsLabel(Number(story.viewCount) || 0)}`);
  }

  if (typeof story.viewsToday !== "undefined") {
    parts.push(`\n📈 Today: ${storyViewsLabel(Number(story.viewsToday) || 0)}`);
  }

  return parts.join("\n");
}

function formatClubListItem(club: any, index: number, cid: string) {
  const name = club.name || "Untitled";
  const handle = club.handle ? `@${club.handle}` : "";
  const description = limitWords(club.description || "", 15);
  const role = clubRoleLabel(club.clubRole);
  const parts = [
    `${index + 1}. <b>${escapeTelegramHtml(name)}</b>`,
    `/cid${cid}`
  ];

  if (handle) parts.push(escapeTelegramHtml(handle));
  if (description) parts.push(`<blockquote>${escapeTelegramHtml(description)}</blockquote>`);
  parts.push(`${escapeTelegramHtml(role)} • ${escapeTelegramHtml(club.platform || "platform")}`);
  return parts.join("\n");
}

function formatClubDetailsText(club: any, cid: string) {
  const parts = [
    `🤝 <b>${escapeTelegramHtml(club.name || "Untitled")}</b>`,
    `/cid${cid}`
  ];

  if (club.handle) parts.push(`\n@${escapeTelegramHtml(club.handle)}`);
  if (club.description) {
    parts.push(`\n<blockquote>${escapeTelegramHtml(normalizeStoryText(club.description))}</blockquote>`);
  }
  parts.push(`\n<b>Type:</b> ${escapeTelegramHtml(clubRoleLabel(club.clubRole))}`);
  if (club.platform) parts.push(`\n<b>Platform:</b> ${escapeTelegramHtml(club.platform)}`);
  if (Array.isArray(club.campusIds) && club.campusIds.length > 0) {
    parts.push(`\n<b>Campus:</b> ${escapeTelegramHtml(club.campusIds.includes("all") ? "All" : club.campusIds.join(", "))}`);
  }
  if (Array.isArray(club.categories) && club.categories.length > 0) {
    parts.push(`\n<b>Category:</b> ${escapeTelegramHtml(club.categories.join(", "))}`);
  }
  if (club.url) parts.push(`\n${escapeTelegramHtml(club.url)}`);

  return parts.join("\n");
}

function buildApprovedClubKeyboard(clubId: string, clubRole: string | undefined) {
  const role = normalizeClubRole(clubRole);
  return {
    inline_keyboard: [
      [
        {
          text: `${role === "student-run" ? "• " : ""}Student-run`,
          callback_data: `club_set_role_student-run_${clubId}`
        },
        {
          text: `${role === "official" ? "• " : ""}Official`,
          callback_data: `club_set_role_official_${clubId}`
        }
      ],
      [
        { text: "Delete", callback_data: `action_delete_club_${clubId}` }
      ]
    ]
  };
}

function getStoryImageUrls(story: any) {
  const slideImages = Array.isArray(story.slides)
    ? story.slides
        .map((slide: any) => slide?.imageUrl)
        .filter((value: unknown) => typeof value === "string" && value.trim().length > 0)
    : [];

  if (slideImages.length > 0) return slideImages;
  return typeof story.imageUrl === "string" && story.imageUrl.trim().length > 0 ? [story.imageUrl] : [];
}

function getDirectCreateTemplate() {
  return [
    `📝 <b>Direct Story Format</b>`,
    ``,
    `Send a photo with this caption:`,
    `<code>/create`,
    `Title: Story title`,
    `Subtitle:`,
    `First line`,
    `Second line`,
    `Link: https://...`,
    `Expires: +7d</code>`,
    ``,
    `Notes:`,
    `- <b>Subtitle</b> can be multiline`,
    `- <b>Expires</b> accepts <code>+3d</code>, <code>+1w</code>, or <code>DD/MM/YYYY</code>`,
    `- Use <code>/stories</code> to browse stories`,
    `- Use <code>/sid0000</code> style commands to open one story in full`
  ].join("\n");
}

function parseUsageDays(text: string) {
  const match = text.trim().match(/^\/usage(?:\s+(\d{1,3}))?$/i);
  if (!match) return 7;

  const parsed = match[1] ? Number.parseInt(match[1], 10) : 7;
  if (!Number.isFinite(parsed)) return 7;

  return Math.min(Math.max(parsed, 1), 90);
}

function normalizeInternalImageUrl(value: string | undefined) {
  if (!value) return value;
  const match = value.match(/^https?:\/\/[^/]+\/\/?api\/images\/(.+)$/i);
  if (match?.[1]) {
    return `/api/images/${match[1]}`;
  }
  return value;
}

async function sendApprovalEmailWithStatus(
  sendFn: (...args: any[]) => Promise<EmailSendResult>,
  ...args: any[]
): Promise<{ status: "sent"; result: EmailSendResult } | { status: "failed"; reason: string }> {
  try {
    const result = await sendFn(...args);
    return { status: "sent", result };
  } catch (error) {
    console.error("Approval email failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown email error";
    return { status: "failed", reason: message };
  }
}

function formatEmailFailureReason(reason: string): string {
  return escapeTelegramHtml(reason).slice(0, 180);
}

function formatEmailSendResult(result: EmailSendResult): string {
  const parts = [
    `delivered=${result.delivered.length}`,
    `queued=${result.queued.length}`,
    `bounced=${result.permanent_bounces.length}`
  ];

  if (result.permanent_bounces.length > 0) {
    parts.push(`bounce: ${result.permanent_bounces.join(", ")}`);
  } else if (result.queued.length > 0) {
    parts.push(`queued: ${result.queued.join(", ")}`);
  } else if (result.delivered.length > 0) {
    parts.push(`delivered: ${result.delivered.join(", ")}`);
  }

  return escapeTelegramHtml(parts.join(" | ")).slice(0, 240);
}

function normalizeClubRole(value: string | undefined) {
  return value === "official" ? "official" : "student-run";
}

function clubRoleLabel(value: string | undefined) {
  return normalizeClubRole(value) === "official" ? "official" : "student-run";
}

function buildClubSuggestionKeyboard(suggestionId: string, clubRole: string | undefined) {
  const role = normalizeClubRole(clubRole);
  return {
    inline_keyboard: [
      [
        {
          text: `${role === "student-run" ? "• " : ""}🎓 Student-run`,
          callback_data: `club_role_student-run_${suggestionId}`
        },
        {
          text: `${role === "official" ? "• " : ""}🏛 Official`,
          callback_data: `club_role_official_${suggestionId}`
        }
      ],
      [
        { text: "✅ Approve", callback_data: `club_approve_${suggestionId}` },
        { text: "❌ Reject", callback_data: `club_reject_${suggestionId}` }
      ]
    ]
  };
}

function updateClubTypeLine(text: string, clubRole: string | undefined) {
  const nextLine = `<b>Club Type:</b> ${clubRoleLabel(clubRole)}`;
  if (/<b>Club Type:<\/b>.*$/m.test(text)) {
    return text.replace(/<b>Club Type:<\/b>.*$/m, nextLine);
  }
  return text;
}

type StatsSection = "overview" | "engagement" | "links" | "stories" | "usage";

function getRecentDayKeys(days: number) {
  const keys: string[] = [];
  const today = new Date();
  for (let index = 0; index < days; index += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - index);
    keys.push(d.toISOString().split("T")[0]);
  }
  return keys;
}

function sumDailyCounters(daily: Record<string, number> | undefined, dayKeys: string[]) {
  if (!daily) return 0;
  return dayKeys.reduce((sum, key) => sum + (Number(daily[key]) || 0), 0);
}

function sumNestedDailyCounters(
  daily: Record<string, Record<string, number>> | undefined,
  dayKeys: string[]
) {
  if (!daily) return 0;
  return dayKeys.reduce((sum, key) => {
    const dayMap = daily[key] || {};
    return sum + Object.values(dayMap).reduce((inner, value) => inner + (Number(value) || 0), 0);
  }, 0);
}

function buildStatsKeyboard(section: StatsSection, days: number, limit: number) {
  const sectionButtons = [
    [
      { text: `${section === "overview" ? "• " : ""}Overview`, callback_data: `stats:overview:${days}:${limit}` },
      { text: `${section === "engagement" ? "• " : ""}Engagement`, callback_data: `stats:engagement:${days}:${limit}` }
    ],
    [
      { text: `${section === "links" ? "• " : ""}Top Links`, callback_data: `stats:links:${days}:${limit}` },
      { text: `${section === "stories" ? "• " : ""}Top Stories`, callback_data: `stats:stories:${days}:${limit}` }
    ],
    [{ text: `${section === "usage" ? "• " : ""}Usage Events`, callback_data: `stats:usage:${days}:${limit}` }]
  ];

  const windows = [1, 7, 30] as const;
  const windowButtons = windows.map((windowDays) => ({
    text: `${days === windowDays ? "• " : ""}${windowDays}d`,
    callback_data: `stats:${section}:${windowDays}:${limit}`
  }));

  const inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = [...sectionButtons, windowButtons];

  if (section === "links" || section === "stories") {
    const sizes = [5, 10, 15] as const;
    inlineKeyboard.push(
      sizes.map((size) => ({
        text: `${limit === size ? "• " : ""}Top ${size}`,
        callback_data: `stats:${section}:${days}:${size}`
      }))
    );
  }

  inlineKeyboard.push([{ text: "Refresh", callback_data: `stats:${section}:${days}:${limit}` }]);
  return { inline_keyboard: inlineKeyboard };
}

function topCountsFromDaily(
  daily: Record<string, Record<string, number>> | undefined,
  dayKeys: string[],
  limit = 5
) {
  const totals = new Map<string, number>();
  for (const day of dayKeys) {
    const dayMap = daily?.[day] || {};
    for (const [id, count] of Object.entries(dayMap)) {
      totals.set(id, (totals.get(id) || 0) + (Number(count) || 0));
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function buildStatsView(params: {
  runtimeEnv: any;
  days: number;
  section: StatsSection;
  limit: number;
}) {
  const kv = params.runtimeEnv?.STORIES_KV;
  if (!kv) return { text: "⚠️ Cloudflare KV not bound!", keyboard: null };

  const [raw, dynamicClubsRaw, storiesRaw] = await Promise.all([
    kv.get("bot_stats"),
    kv.get("dynamic_clubs"),
    kv.get("stories")
  ]);

  let clubsCount = 0;
  let storiesCount = 0;
  let storyItems: any[] = [];
  let stats: any = null;

  try {
    clubsCount = JSON.parse(dynamicClubsRaw || "[]").length;
  } catch {}
  try {
    storyItems = JSON.parse(storiesRaw || "[]");
    storiesCount = storyItems.length;
  } catch {}
  try {
    stats = raw ? JSON.parse(raw) : null;
  } catch {}

  const dayKeys = getRecentDayKeys(params.days);
  const today = dayKeys[0];
  const normalizedLimit = [5, 10, 15].includes(params.limit) ? params.limit : 5;
  const keyboard = buildStatsKeyboard(params.section, params.days, normalizedLimit);

  let text = `📊 <b>System Statistics</b>\n`;
  text += `Window: last <b>${params.days} day(s)</b>\n\n`;
  text += `<b>Live Content:</b>\n`;
  text += `- Active Stories: ${storiesCount}\n`;
  text += `- Approved Clubs: ${clubsCount}\n\n`;

  if (!stats) {
    text += `No engagement stats stored yet.`;
    return { text, keyboard };
  }

  const windowSuggestions = sumDailyCounters(stats.suggestions?.daily, dayKeys);
  const todaySuggestions = Number(stats.suggestions?.daily?.[today] || 0);
  const windowStoryViews = sumNestedDailyCounters(stats.storyViews?.daily, dayKeys);
  const todayStoryViews = sumNestedDailyCounters(stats.storyViews?.daily, [today]);

  if (params.section === "overview") {
    text += `<b>Overview:</b>\n`;
    text += `- Suggestions (All Time): ${stats.suggestions?.allTime || 0}\n`;
    text += `- Suggestions (${params.days}d): ${windowSuggestions}\n`;
    text += `- Suggestions (Today): ${todaySuggestions}\n`;
    text += `- Story Views (${params.days}d): ${windowStoryViews}\n`;
    text += `- Story Views (Today): ${todayStoryViews}\n`;
  }

  if (params.section === "engagement") {
    text += `<b>Engagement:</b>\n`;
    text += `- Suggestions (All Time): ${stats.suggestions?.allTime || 0}\n`;
    text += `- Suggestions (${params.days}d): ${windowSuggestions}\n`;
    text += `- Suggestions (Today): ${todaySuggestions}\n\n`;
    text += `<b>Admin Performance:</b>\n`;
    text += `- Approved: ${stats.actions?.approved || 0}\n`;
    text += `- Declined: ${stats.actions?.declined || 0}\n`;
    text += `- Direct Created: ${stats.actions?.directCreated || 0}\n`;
  }

  if (params.section === "links") {
    const topLinks = topCountsFromDaily(stats.links?.daily, dayKeys, normalizedLimit);
    text += `<b>Top Links (${params.days}d, top ${normalizedLimit}):</b>\n`;
    if (topLinks.length === 0) {
      text += `No link clicks in this window.\n`;
    } else {
      topLinks.forEach(([linkId, count], index) => {
        const link = allLinks.find((item) => item.id === linkId);
        text += `${index + 1}. ${escapeTelegramHtml(link?.title || linkId)} - ${count}\n`;
      });
    }

    const popularAllTime = await getPopularLinkStats(kv, Math.min(normalizedLimit, 10));
    if (popularAllTime.length > 0) {
      text += `\n<b>All-Time Leaders:</b>\n`;
      popularAllTime.forEach((item, index) => {
        const link = allLinks.find((entry) => entry.id === item.linkId);
        text += `${index + 1}. ${escapeTelegramHtml(link?.title || item.linkId)} - ${item.total}\n`;
      });
    }
  }

  if (params.section === "stories") {
    const topStories = topCountsFromDaily(stats.storyViews?.daily, dayKeys, normalizedLimit);
    text += `<b>Top Stories (${params.days}d, top ${normalizedLimit}):</b>\n`;
    if (topStories.length === 0) {
      text += `No story views in this window.\n`;
    } else {
      topStories.forEach(([storyId, count], index) => {
        const story = storyItems.find((item) => item.id === storyId);
        text += `${index + 1}. ${escapeTelegramHtml(story?.title || storyId)} - ${count}\n`;
      });
    }
  }

  if (params.section === "usage") {
    const usageSummary = await queryUsageSummary({
      accountId: params.runtimeEnv?.CLOUDFLARE_ACCOUNT_ID || (env as any).CLOUDFLARE_ACCOUNT_ID,
      apiToken:
        params.runtimeEnv?.PRIVATE_CLOUDFLARE_ANALYTICS_API_TOKEN ||
        (env as any).PRIVATE_CLOUDFLARE_ANALYTICS_API_TOKEN,
      dataset:
        params.runtimeEnv?.PRIVATE_CLOUDFLARE_ANALYTICS_DATASET ||
        (env as any).PRIVATE_CLOUDFLARE_ANALYTICS_DATASET,
      days: params.days
    });

    text += `<b>Privacy-Preserving Usage Events (${params.days}d):</b>\n`;
    if (usageSummary.state === "not_configured") {
      text += `Analytics Engine query not configured.\n`;
      text += `Missing: ${usageSummary.missing.join(", ")}\n`;
    } else if (usageSummary.state === "error") {
      text += `Analytics Engine query failed.\n`;
      text += `${escapeTelegramHtml(usageSummary.reason)}\n`;
    } else if (usageSummary.rows.length === 0) {
      text += `No usage events returned in this window.\n`;
    } else {
      usageSummary.rows.forEach((row: { eventType: string; count: number }, index: number) => {
        text += `${index + 1}. ${escapeTelegramHtml(row.eventType)} - ${Math.round(row.count)}\n`;
      });
    }
  }

  return { text, keyboard };
}

async function cleanupPendingStoryImages(suggestion: any, runtimeEnv: any) {
  const pendingImageKeys = Array.isArray(suggestion?.pendingImageKeys)
    ? suggestion.pendingImageKeys.filter((key: unknown) => typeof key === "string" && key.length > 0)
    : [];

  if (pendingImageKeys.length === 0 || !runtimeEnv?.IMAGES_BUCKET) return;

  await Promise.all(
    pendingImageKeys.map((key: string) => runtimeEnv.IMAGES_BUCKET.delete(key).catch(() => {}))
  );
}

export async function POST({ request, platform }) {
  try {
    const body = await request.json();
    const runtimeEnv = platform?.env;
    const botToken = (env as any).PRIVATE_TELEGRAM_BOT_TOKEN || (runtimeEnv as any)?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const adminChatId = (env as any).PRIVATE_TELEGRAM_CHAT_ID || (runtimeEnv as any)?.PRIVATE_TELEGRAM_CHAT_ID;
    const siteUrl = (env as any).PRIVATE_SITE_URL || (runtimeEnv as any)?.PRIVATE_SITE_URL || new URL(request.url).origin;

    if (!botToken) return json({ error: "No bot token" }, { status: 500 });

    if (body.message && body.message.reply_to_message && body.message.text) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const originalMsgId = body.message.reply_to_message.message_id;
        const originalKeyboard = body.message.reply_to_message.reply_markup;
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            message_id: originalMsgId,
            caption: body.message.text,
            parse_mode: "HTML",
            reply_markup: originalKeyboard
          })
        });

        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            message_id: body.message.message_id
          })
        });
        
        const kv = runtimeEnv?.STORIES_KV;
        if (kv) incrementStat(kv, "actions", "edited").catch(() => {});
      }
      return json({ success: true });
    }

    if (body.message && body.message.text?.startsWith("/alert")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (kv) {
          const text = body.message.text.replace("/alert", "").trim();
          const adminName = body.message.from.first_name || "Admin";
          
          if (text === "clear" || text === "") {
            await kv.delete("campus_alert");
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: `✅ <b>Global alert cleared</b> by ${adminName}.`, parse_mode: "HTML" })
            });
          } else {
            await kv.put("campus_alert", JSON.stringify({ 
              text, 
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              createdBy: adminName
            }));
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: `🚨 <b>Global alert broadcasted</b> by ${adminName} for 24h!\n\n"${text}"`, parse_mode: "HTML" })
            });
          }
        }
      }
      return json({ success: true });
    }

    if (body.message && body.message.text === "/help") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const text = `🛠 <b>CampusWeb Bot Guide</b>\n\n` +
          `<b>Commands:</b>\n` +
          `/stories - Manage active Stories\n` +
          `/sid0000 - Open one story in full\n` +
          `/clubs - Manage approved Clubs\n` +
          `/cid0000 - Open one club in full\n` +
          `/create - Show direct story format\n` +
          `/alert [text] - Set global app alert\n` +
          `/alert clear - Remove global alert\n` +
          `/stats - Interactive system statistics\n` +
          `/usage - Open the privacy usage panel directly\n` +
          `/help - Show this guide\n\n` +
          `<b>Workflow:</b>\n` +
          `1. Student submits suggestion via Web App.\n` +
          `2. You receive a notification with <b>Approve/Reject</b> buttons.\n` +
          `3. Approving automatically publishes and notifies the student.\n\n` +
          `<b>Stats Flow:</b>\n` +
          `1. Use /stats to choose a section and time window.\n` +
          `2. Use Top Links / Top Stories to adjust the result size.\n` +
          `3. Use /usage to jump straight to analytics events.\n\n` +
          `<b>Direct Entry:</b>\n` +
          getDirectCreateTemplate();
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text, parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    if (body.message && body.message.text === "/create") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text: getDirectCreateTemplate(), parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    if (body.message && body.message.text === "/stats") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const { text: statsStr, keyboard } = await buildStatsView({
          runtimeEnv,
          days: 7,
          section: "overview",
          limit: 5
        });

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            text: statsStr,
            parse_mode: "HTML",
            reply_markup: keyboard || undefined
          })
        });
      }
      return json({ success: true });
    }

    if (body.message && /^\/usage(?:\s+\d{1,3})?$/i.test(body.message.text || "")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const days = parseUsageDays(body.message.text || "");
        const { text: usageText, keyboard } = await buildStatsView({
          runtimeEnv,
          days,
          section: "usage",
          limit: 5
        });

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            text: usageText,
            parse_mode: "HTML",
            reply_markup: keyboard || undefined
          })
        });
      }
      return json({ success: true });
    }

    if (body.message && /^\/sid\d{4}$/i.test(body.message.text || "")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "⚠️ Cloudflare KV not bound!" })
          });
          return json({ success: true });
        }

        let items: any[] = [];
        const kvData = await kv.get("stories");
        if (kvData) { try { items = JSON.parse(kvData); } catch(e) {} }
        const botStatsRaw = await kv.get("bot_stats");
        const botStats = botStatsRaw ? JSON.parse(botStatsRaw) : null;
        const storyViews = botStats?.storyViews?.allTime || {};
        const today = new Date().toISOString().split("T")[0];
        const todayStoryViews = botStats?.storyViews?.daily?.[today] || {};

        items = items.map((item) => ({
          ...item,
          viewCount: Number(storyViews[item.id]) || 0,
          viewsToday: Number(todayStoryViews[item.id]) || 0
        }));

        const sid = (body.message.text || "").replace("/sid", "").trim();
        const storySidMap = assignStoryShortIds(items);
        const story = items.find((item) => storySidMap.get(item.id) === sid);

        if (!story) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: `⚠️ Story <code>/sid${escapeTelegramHtml(sid)}</code> not found.`, parse_mode: "HTML" })
          });
          return json({ success: true });
        }

        const imageUrls = getStoryImageUrls(story);
        const detailsText = formatStoryDetailsText(story, sid);

        if (imageUrls.length > 1) {
          const media = imageUrls.slice(0, 10).map((imageUrl: string, index: number) => ({
            type: "photo",
            media: imageUrl,
            caption: index === 0 ? `📖 ${story.title}` : undefined
          }));

          await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, media })
          });
        } else if (imageUrls[0]) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: msgChatId,
              photo: imageUrls[0],
              caption: `${story.title}\n/sid${sid}`
            })
          });
        }

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text: detailsText, parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    if (body.message && /^\/cid\d{4}$/i.test(body.message.text || "")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "Cloudflare KV not bound." })
          });
          return json({ success: true });
        }

        let clubs: any[] = [];
        const kvData = await kv.get("dynamic_clubs");
        if (kvData) { try { clubs = JSON.parse(kvData); } catch(e) {} }

        const cid = (body.message.text || "").replace("/cid", "").trim();
        const clubCidMap = assignShortIds(clubs);
        const club = clubs.find((item) => clubCidMap.get(item.id) === cid);

        if (!club) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: `Club /cid${escapeTelegramHtml(cid)} not found.`, parse_mode: "HTML" })
          });
          return json({ success: true });
        }

        const text = formatClubDetailsText(club, cid);
        const logoUrl = typeof club.logoUrl === "string" && club.logoUrl.trim() ? club.logoUrl : "";

        if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: msgChatId,
              photo: logoUrl,
              caption: text,
              parse_mode: "HTML",
              reply_markup: buildApprovedClubKeyboard(club.id, club.clubRole)
            })
          });
        } else {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: msgChatId,
              text,
              parse_mode: "HTML",
              reply_markup: buildApprovedClubKeyboard(club.id, club.clubRole)
            })
          });
        }
      }
      return json({ success: true });
    }

    if (body.message && (body.message.text === "/stories" || body.message.text === "/list" || body.message.text === "/clubs")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "⚠️ Cloudflare KV not bound!" })
          });
          return json({ success: true });
        }
        
        const isClubs = body.message.text === "/clubs";
        const key = isClubs ? "dynamic_clubs" : "stories";
        const label = isClubs ? "Clubs" : "Stories";
        const prefix = isClubs ? "club" : "story";
        
        let items: any[] = [];
        const kvData = await kv.get(key);
        if (kvData) { try { items = JSON.parse(kvData); } catch(e) {} }
        if (!isClubs) {
          try {
            const botStatsRaw = await kv.get("bot_stats");
            const botStats = botStatsRaw ? JSON.parse(botStatsRaw) : null;
            const storyViews = botStats?.storyViews?.allTime || {};
            const today = new Date().toISOString().split("T")[0];
            const todayStoryViews = botStats?.storyViews?.daily?.[today] || {};
            items = items.map((item) => ({
              ...item,
              viewCount: Number(storyViews[item.id]) || 0,
              viewsToday: Number(todayStoryViews[item.id]) || 0
            }));
          } catch (e) {}
        }
        
        if (items.length === 0) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: `📭 There are no active dynamic ${label.toLowerCase()}.` })
          });
          return json({ success: true });
        }
        
        let text = `📚 <b>Dynamic ${label} Management</b>\n\n`;
        const deleteButtons: Array<{ text: string; callback_data: string }> = [];
        const storySidMap = !isClubs ? assignStoryShortIds(items) : new Map<string, string>();
        const clubCidMap = isClubs ? assignShortIds(items) : new Map<string, string>();
        
        items.slice(0, 15).forEach((item, idx) => {
          if (isClubs) {
            const cid = clubCidMap.get(item.id) || "0000";
            text += `${formatClubListItem(item, idx, cid)}\n\n`;
          } else {
            const sid = storySidMap.get(item.id) || "0000";
            text += `${formatStoryListItem(item, idx, sid)}\n\n`;
          }
          deleteButtons.push({ text: `Del ${idx + 1}`, callback_data: `action_delete_${prefix}_${item.id}` });
        });
        
        if (items.length > 15) text += `\n<i>(Showing first 15 of ${items.length})</i>`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: chunkButtons(deleteButtons, 3) } })
        });
      }
      return json({ success: true });
    }

    if (body.message && body.message.photo) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const msg = body.message;
        const isCreate = msg.caption?.startsWith("/create");
        const isAlbumSecondary = msg.media_group_id && !msg.caption;
        
        if (isCreate || isAlbumSecondary) {
          const kv = runtimeEnv?.STORIES_KV;
          if (!kv) return json({ error: "No KV bound" });
          
          let title = "Direct Story", subtitle = "", linkUrl = "", expiresParsed = "";
          let finalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          if (isCreate) {
            const caption = msg.caption || "";
            title = extractFirstMatchingBlockField(caption, ["Title"]) || "Direct Story";
            subtitle = extractFirstMatchingBlockField(caption, ["Subtitle", "Description", "Desc"]);
            linkUrl = extractFirstMatchingBlockField(caption, ["Link", "URL"]);
            expiresParsed = extractFirstMatchingBlockField(caption, ["Expires", "Expiry"]);
            finalExpiresAt = parseExpiration(expiresParsed);
            
            if (msg.media_group_id) {
              await kv.put(`album_${msg.media_group_id}`, JSON.stringify({ title, subtitle, linkUrl, finalExpiresAt }), { expirationTtl: 300 });
            }
          } else if (isAlbumSecondary) {
            let cached = null;
            for (let i = 0; i < 4; i++) {
              cached = await kv.get(`album_${msg.media_group_id}`);
              if (cached) break;
              await new Promise(r => setTimeout(r, 500));
            }
            if (cached) {
              try {
                const data = JSON.parse(cached);
                title = data.title; subtitle = data.subtitle; linkUrl = data.linkUrl; finalExpiresAt = data.finalExpiresAt;
              } catch(e) {}
            } else {
              return json({ success: true });
            }
          }
          
          const photoId = msg.photo[msg.photo.length - 1].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
          const fileData = await fileRes.json();
          if (!fileData.ok) return json({ error: "File fetch failed" });
          
          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          const r2 = runtimeEnv?.IMAGES_BUCKET;
          if (!r2) return json({ error: "No R2 bound" });
          
          let imgBlob;
          try {
            const imgRes = await fetch(fileUrl);
            imgBlob = await imgRes.blob();
          } catch (e: any) { return json({ error: "Telegram download failed" }); }
          
          const filename = `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          await r2.put(filename, imgBlob, { httpMetadata: { contentType: "image/jpeg" } });
          const permanentImageUrl = `/api/images/${filename}`;
          
          const newStory = {
            id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title, subtitle, imageUrl: permanentImageUrl, linkUrl,
            seen: false, createdAt: new Date().toISOString(), expiresAt: finalExpiresAt
          };
          let existingStories = [];
          const kvData = await kv.get("stories");
          if (kvData) { try { existingStories = JSON.parse(kvData); } catch(e) {} }
          existingStories.unshift(newStory);
          await kv.put("stories", JSON.stringify(existingStories));
          
          if (isCreate) {
            incrementStat(kv, "actions", "directCreated").catch(() => {});
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: msg.media_group_id ? "✅ <b>Direct Album Published!</b>" : "✅ <b>Direct Story Published!</b>", parse_mode: "HTML", reply_to_message_id: msg.message_id })
            });
          }
          return json({ success: true });
        }
      }
    }

    if (!body.callback_query) {
      return json({ success: true });
    }

    const cb = body.callback_query;
    const action = cb.data;
    const message = cb.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    const editMessage = async (newCaption: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: newCaption,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] }
        })
      });
    };

    const editTextMessage = async (newText: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] }
        })
      });
    };

    if (action === "action_edit_hint") {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          callback_query_id: cb.id, 
          text: "✏️ HOW TO EDIT:\n\n1. Copy the text of this message.\n2. Paste it in your chat and fix any typos.\n3. Swipe Left on THIS message to Reply to it.\n4. Send your message!\n\nThe bot will automatically overwrite this suggestion with your edited text.", 
          show_alert: true 
        })
      }).catch(() => {});
      return json({ success: true });
    }

    if (action.startsWith("stats:")) {
      const parts = action.split(":");
      const section = (parts[1] || "overview") as StatsSection;
      const parsedDays = Number(parts[2] || "7");
      const parsedLimit = Number(parts[3] || "5");
      const days = parsedDays === 1 || parsedDays === 7 || parsedDays === 30 ? parsedDays : 7;
      const limit = parsedLimit === 5 || parsedLimit === 10 || parsedLimit === 15 ? parsedLimit : 5;
      const msgChatId = cb.message?.chat?.id?.toString();

      if (msgChatId !== adminChatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Admin only", show_alert: true })
        }).catch(() => {});
        return json({ success: true });
      }

      const selectedSection: StatsSection = ["overview", "engagement", "links", "stories", "usage"].includes(
        section
      )
        ? section
        : "overview";

      const view = await buildStatsView({
        runtimeEnv,
        days,
        section: selectedSection,
        limit
      });

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: view.text,
          parse_mode: "HTML",
          reply_markup: view.keyboard || undefined
        })
      });

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id })
      }).catch(() => {});

      return json({ success: true });
    }

    if (action.startsWith("club_set_role_")) {
      const match = action.match(/^club_set_role_(student-run|official)_(.+)$/);
      const nextRole = match?.[1];
      const clubId = match?.[2];
      const kv = runtimeEnv?.STORIES_KV;

      if (!nextRole || !clubId || !kv) {
        return json({ success: true });
      }

      const dynamicClubsRaw = await kv.get("dynamic_clubs");
      let clubs: any[] = [];
      if (dynamicClubsRaw) {
        try { clubs = JSON.parse(dynamicClubsRaw); } catch(e) {}
      }

      const clubIndex = clubs.findIndex((club) => club.id === clubId);
      if (clubIndex === -1) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Club not found", show_alert: true })
        }).catch(() => {});
        return json({ success: true });
      }

      clubs[clubIndex] = {
        ...clubs[clubIndex],
        clubRole: normalizeClubRole(nextRole)
      };
      await kv.put("dynamic_clubs", JSON.stringify(clubs));

      const clubCidMap = assignShortIds(clubs);
      const cid = clubCidMap.get(clubId) || "0000";
      const updatedText = formatClubDetailsText(clubs[clubIndex], cid);
      const reply_markup = buildApprovedClubKeyboard(clubId, clubs[clubIndex].clubRole);
      const endpoint = message.caption ? "editMessageCaption" : "editMessageText";
      const bodyPayload = message.caption
        ? { chat_id: chatId, message_id: messageId, caption: updatedText, parse_mode: "HTML", reply_markup }
        : { chat_id: chatId, message_id: messageId, text: updatedText, parse_mode: "HTML", reply_markup };

      await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: `Set as ${clubRoleLabel(nextRole)}` })
      }).catch(() => {});

      return json({ success: true });
    }

    if (action.startsWith("action_delete_story_") || action.startsWith("action_delete_club_")) {
      const isClub = action.startsWith("action_delete_club_");
      const id = action.replace(isClub ? "action_delete_club_" : "action_delete_story_", "");
      const kv = runtimeEnv?.STORIES_KV;
      
      if (kv) {
        const key = isClub ? "dynamic_clubs" : "stories";
        let items: Array<{ id: string }> = [];
        const kvData = await kv.get(key);
        if (kvData) { try { items = JSON.parse(kvData); } catch(e) {} }
        
        const updated = items.filter(item => item.id !== id);
        await kv.put(key, JSON.stringify(updated));
        
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: `🗑 ${isClub ? "Club" : "Story"} deleted!`, show_alert: true })
        }).catch(() => {});
        
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        });
      }
      return json({ success: true });
    }

    if (
      action === "action_reject" ||
      action === "club_reject" ||
      action.startsWith("club_reject_") ||
      action.startsWith("story_reject_") ||
      action.startsWith("promo_reject_")
    ) {
      const isClub = action.startsWith("club_reject");
      const isStory = action.startsWith("story_reject_");
      const isPromo = action.startsWith("promo_reject_");
      const suggestionId = (isClub
        ? action.replace("club_reject_", "")
        : isStory
          ? action.replace("story_reject_", "")
          : isPromo
            ? action.replace("promo_reject_", "")
            : null)?.replace("_confirm", "");
      const adminName = cb.from.first_name || "Admin";
      
      if (!action.includes("_confirm")) {
        const confirmAction = `${action}_confirm`;
        const resetAction = isClub
          ? `club_reset_${suggestionId}`
          : isStory
            ? `story_reset_${suggestionId}`
            : isPromo
              ? `promo_reset_${suggestionId}`
              : "action_reset";
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⚠️ Confirm Rejection", callback_data: confirmAction },
                  { text: "🔙 Cancel", callback_data: resetAction }
                ]
              ]
            }
          })
        });
        
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Are you sure?" })
        }).catch(() => {});
        return json({ success: true });
      }

      const kv = runtimeEnv?.STORIES_KV;
      if (kv && !isClub) incrementStat(kv, "actions", "declined").catch(() => {});
      
      const label = isClub ? "Club Suggestion" : isPromo ? "Promotion" : "Suggestion";
      const originalText = (message.text || message.caption || "").split("\n---")[0];
      const newText = originalText + `\n\n---\n❌ <b>${label} Rejected</b> by ${adminName}`;
      
      if (isClub) {
        await editTextMessage(newText);
        if (suggestionId && kv) await kv.delete(`club_suggestion:${suggestionId}`);
      } else {
        await editMessage(newText);
        if (isStory && suggestionId && kv) {
          const suggestionRaw = await kv.get(`story_suggestion:${suggestionId}`);
          if (suggestionRaw) {
            try {
              await cleanupPendingStoryImages(JSON.parse(suggestionRaw), runtimeEnv);
            } catch {}
          }
          await kv.delete(`story_suggestion:${suggestionId}`);
        } else if (isPromo && suggestionId && kv) {
          await kv.delete(`promo_suggestion:${suggestionId}`);
        }
      }
      
      return json({ success: true });
    }

    if (action.startsWith("club_reset_") || action.startsWith("story_reset_") || action.startsWith("promo_reset_") || action === "action_reset") {
      const isClub = action.startsWith("club_reset_");
      const isStory = action.startsWith("story_reset_");
      const isPromo = action.startsWith("promo_reset_");
      const suggestionId = isClub
        ? action.replace("club_reset_", "")
        : isStory
          ? action.replace("story_reset_", "")
          : isPromo
            ? action.replace("promo_reset_", "")
            : null;
      
      let keyboard = isClub ? buildClubSuggestionKeyboard(suggestionId || "", "student-run") : {
        inline_keyboard: [
          [
            { text: "✅ Approve & Publish", callback_data: isStory ? `story_approve_${suggestionId}` : isPromo ? `promo_approve_${suggestionId}` : "action_approve" },
            { text: "✏️ Edit Text", callback_data: "action_edit_hint" },
            { text: "❌ Reject", callback_data: isStory ? `story_reject_${suggestionId}` : isPromo ? `promo_reject_${suggestionId}` : "action_reject" }
          ]
        ]
      };

      if (isClub && suggestionId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (kv) {
          const suggestionRaw = await kv.get(`club_suggestion:${suggestionId}`);
          if (suggestionRaw) {
            try {
              const suggestion = JSON.parse(suggestionRaw);
              keyboard = buildClubSuggestionKeyboard(suggestionId, suggestion.clubRole);
            } catch {}
          }
        }
      }

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: keyboard
        })
      });
      return json({ success: true });
    }

    if (action.startsWith("club_role_")) {
      const match = action.match(/^club_role_(student-run|official)_(.+)$/);
      const nextRole = match?.[1];
      const suggestionId = match?.[2];
      const kv = runtimeEnv?.STORIES_KV;

      if (!nextRole || !suggestionId || !kv) {
        return json({ success: true });
      }

      const suggestionRaw = await kv.get(`club_suggestion:${suggestionId}`);
      if (!suggestionRaw) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Suggestion not found", show_alert: true })
        }).catch(() => {});
        return json({ success: true });
      }

      let suggestion: any;
      try {
        suggestion = JSON.parse(suggestionRaw);
      } catch {
        return json({ success: true });
      }

      suggestion.clubRole = normalizeClubRole(nextRole);
      await kv.put(`club_suggestion:${suggestionId}`, JSON.stringify(suggestion), {
        expirationTtl: 60 * 60 * 24 * 30
      });

      const updatedText = updateClubTypeLine(message.text || "", suggestion.clubRole);
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: updatedText,
          parse_mode: "HTML",
          reply_markup: buildClubSuggestionKeyboard(suggestionId, suggestion.clubRole)
        })
      });

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: `Set as ${clubRoleLabel(suggestion.clubRole)}` })
      }).catch(() => {});

      return json({ success: true });
    }

    if (action.startsWith("club_approve_")) {
      const suggestionId = action.replace("club_approve_", "");
      const kv = runtimeEnv?.STORIES_KV;
      const adminName = cb.from.first_name || "Admin";
      
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: "🚀 Publishing club..." })
      }).catch(() => {});

      if (!kv) {
        await editTextMessage(`⚠️ <b>Error:</b> STORIES_KV not bound.\n\n` + (message.text || ""));
        return json({ success: true });
      }

      const suggestionRaw = await kv.get(`club_suggestion:${suggestionId}`);
      if (!suggestionRaw) {
        await editTextMessage(`⚠️ <b>Error:</b> Suggestion expired or not found.\n\n` + (message.text || ""));
        return json({ success: true });
      }

      const suggestion = JSON.parse(suggestionRaw);
      const clubRole = normalizeClubRole(suggestion.clubRole);

      const platform = suggestion.platform;
      let handle = suggestion.handleOrUrl;
      let url = suggestion.handleOrUrl;

      if (platform === "instagram") {
        handle = handle.replace("@", "").replace("https://www.instagram.com/", "").replace("/", "");
        url = `https://www.instagram.com/${handle}/`;
      }

      const newClub = {
        id: `club-${suggestionId.substring(0, 8)}`,
        type: "club",
        clubRole,
        name: suggestion.clubName,
        handle: platform === "instagram" ? handle : "Join Group",
        platform: platform,
        url: url,
        campusIds: [suggestion.campusId],
        categories: suggestion.category ? [suggestion.category] : [],
        logoUrl: suggestion.logoDataUrl || suggestion.logoUrl || undefined,
        description: suggestion.note ? suggestion.note.slice(0, 180) : undefined,
        verified: true,
        priority: 0
      };

      const dynamicClubsRaw = await kv.get("dynamic_clubs");
      let dynamicClubs = [];
      if (dynamicClubsRaw) {
        try { dynamicClubs = JSON.parse(dynamicClubsRaw); } catch(e) {}
      }
      
      if (!dynamicClubs.some((c: any) => c.url === newClub.url)) {
        dynamicClubs.unshift(newClub);
        await kv.put("dynamic_clubs", JSON.stringify(dynamicClubs));
      }

      const emailResult = suggestion.contactEmail
        ? await sendApprovalEmailWithStatus(
            sendClubApprovalEmail,
            suggestion.contactEmail,
            suggestion.clubName,
            runtimeEnv
          )
        : null;

      const finalKeyboard = {
        inline_keyboard: [
          [{ text: "🌐 View on Website", url: `${siteUrl}/feed` }]
        ]
      };

      const originalText = (message.text || "").split("\n---")[0];
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const clubStatusLine =
        emailResult?.status === "sent"
          ? `\n📧 <b>Approval email sent</b>\n<code>${formatEmailSendResult(emailResult.result)}</code>`
          : emailResult?.status === "failed"
            ? `\n⚠️ <b>Approval email failed</b>\n<code>${formatEmailFailureReason(emailResult.reason)}</code>`
            : "";

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: originalText + `\n\n---\n✅ <b>Published</b> by ${adminName} at ${timeStr}${clubStatusLine}`,
          parse_mode: "HTML",
          reply_markup: finalKeyboard
        })
      });
      
      await kv.delete(`club_suggestion:${suggestionId}`);
      
      return json({ success: true });
    }

    if (action.startsWith("promo_approve_")) {
      const suggestionId = action.replace("promo_approve_", "");
      const kv = runtimeEnv?.STORIES_KV;
      const adminName = cb.from.first_name || "Admin";

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: "🚀 Publishing promotion..." })
      }).catch(() => {});

      if (!kv) {
        await editTextMessage(`⚠️ <b>Error:</b> STORIES_KV not bound.\n\n` + (message.caption || message.text || ""));
        return json({ success: true });
      }

      const suggestionRaw = await kv.get(`promo_suggestion:${suggestionId}`);
      if (!suggestionRaw) {
        await editTextMessage(`⚠️ <b>Error:</b> Promotion expired or not found.\n\n` + (message.caption || message.text || ""));
        return json({ success: true });
      }

      const suggestion = JSON.parse(suggestionRaw);

      const newPromo = {
        id: `promo-${suggestionId.substring(0, 8)}`,
        title: suggestion.promoTitle || "Special Offer",
        subtitle: suggestion.promoDescription || "",
        linkUrl: suggestion.targetLink || "#",
        campusIds: suggestion.campusId ? [suggestion.campusId] : ["all"],
        expiresAt: suggestion.expirationDate ? new Date(suggestion.expirationDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        imageUrl: suggestion.logoDataUrl || suggestion.logoUrl || undefined,
        label: suggestion.promoBadge || "Promotion",
        cta: suggestion.ctaText || "",
        priority: 0
      };

      const promotionsRaw = await kv.get("promotions");
      let promotions = [];
      if (promotionsRaw) {
        try { promotions = JSON.parse(promotionsRaw); } catch(e) {}
      }
      
      promotions.unshift(newPromo);
      await kv.put("promotions", JSON.stringify(promotions));

      incrementStat(kv, "actions", "approved").catch(() => {});

      const finalKeyboard = {
        inline_keyboard: [
          [{ text: "🌐 View on Website", url: `${siteUrl}/feed` }]
        ]
      };

      const isTextReview = !!message.text;
      const originalText = ((isTextReview ? message.text : message.caption) || "").split("\n---")[0];
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      await fetch(`https://api.telegram.org/bot${botToken}/${isTextReview ? "editMessageText" : "editMessageCaption"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          [isTextReview ? "text" : "caption"]: originalText + `\n\n---\n✅ <b>Published</b> by ${adminName} at ${timeStr}`,
          parse_mode: "HTML",
          reply_markup: finalKeyboard
        })
      });
      
      await kv.delete(`promo_suggestion:${suggestionId}`);
      
      return json({ success: true });
    }

    if (action === "action_approve" || action.startsWith("story_approve_")) {
      const suggestionId = action.startsWith("story_approve_")
        ? action.replace("story_approve_", "")
        : null;
      let storedSuggestion: any = null;
      let permanentImageUrl = "";

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: "Processing..." })
      }).catch(() => {});

      const caption = message.caption || "";
      const kv = runtimeEnv?.STORIES_KV;
      if (!kv) {
        await editMessage("⚠️ Error: Cloudflare KV (STORIES_KV) is not bound.");
        return json({ error: "No KV bound" });
      }

      if (suggestionId) {
        const suggestionRaw = await kv.get(`story_suggestion:${suggestionId}`);
        if (suggestionRaw) {
          try {
            storedSuggestion = JSON.parse(suggestionRaw);
          } catch (e) {}
        }
      }

      const title = storedSuggestion?.title || extractBlockField(caption, "Title") || "New Story";
      const subtitle = extractBlockField(caption, "Subtitle");
      const tag = extractBlockField(caption, "Tag");
      const linkUrl = extractBlockField(caption, "Link");
      const expiresParsed = extractBlockField(caption, "Expires");
      const finalExpiresAt = parseExpiration(storedSuggestion?.expiresAt || expiresParsed);

      const storedSlides = Array.isArray(storedSuggestion?.slides)
        ? storedSuggestion.slides
            .map((slide: any) => ({
              imageUrl: normalizeInternalImageUrl(typeof slide?.imageUrl === "string" ? slide.imageUrl : "") || "",
              subtitle: typeof slide?.subtitle === "string" ? slide.subtitle : "",
              tag: typeof slide?.tag === "string" ? slide.tag : undefined,
              linkUrl: typeof slide?.linkUrl === "string" ? slide.linkUrl : undefined
            }))
            .filter((slide: { imageUrl: string }) => slide.imageUrl.trim().length > 0)
        : [];

      if (storedSlides.length > 0) {
        permanentImageUrl = storedSlides[0].imageUrl;
      } else {
        if (!message.photo || message.photo.length === 0) {
          await editMessage("⚠️ Error: No photo found in this message.");
          return json({ error: "No photo" });
        }

        const photoId = message.photo[message.photo.length - 1].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
        const fileData = await fileRes.json();

        if (!fileData.ok) {
          await editMessage("⚠️ Error: Failed to retrieve file path from Telegram.");
          return json({ error: "Telegram file get failed" });
        }

        const r2 = runtimeEnv?.IMAGES_BUCKET;
        if (!r2) {
          await editMessage("⚠️ Error: Cloudflare R2 (IMAGES_BUCKET) is not bound.");
          return json({ error: "No R2 bound" });
        }

        let imgBlob;
        try {
          const imgRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`);
          imgBlob = await imgRes.blob();
        } catch (e: any) {
          await editMessage(`⚠️ Error: Failed to download image from Telegram. ${e.message}`);
          return json({ error: "Telegram download failed" });
        }

        const filename = `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
        try {
          await r2.put(filename, imgBlob, {
            httpMetadata: { contentType: "image/jpeg" }
          });
        } catch (e: any) {
          await editMessage(`⚠️ Error: R2 upload failed. ${e.message}`);
          return json({ error: "R2 upload failed" });
        }

        permanentImageUrl = `/api/images/${filename}`;
      }

      const slides = storedSlides.length > 0
        ? storedSlides
        : [{
            imageUrl: permanentImageUrl,
            subtitle: "",
            tag: storedSuggestion?.tag || tag || undefined,
            linkUrl: storedSuggestion?.linkUrl || linkUrl || undefined
          }];

      const storySubtitle = storedSuggestion?.subtitle || subtitle || "";
      const storyTag = storedSuggestion?.tag || tag || "";
      const storyLinkUrl = storedSuggestion?.linkUrl || linkUrl || "";
      const storyMode = storedSuggestion?.storyMode || (slides.length > 1 ? "sequence" : "single");

      const newStory = {
        id: `story-${Date.now()}`,
        title,
        subtitle: storySubtitle,
        tag: storyTag,
        storyMode,
        slides,
        imageUrl: normalizeInternalImageUrl(permanentImageUrl) || permanentImageUrl,
        linkUrl: storyLinkUrl,
        seen: false,
        createdAt: new Date().toISOString(),
        expiresAt: finalExpiresAt
      };

      let existingStories = [];
      const kvData = await kv.get("stories");
      if (kvData) {
        try {
          existingStories = JSON.parse(kvData);
        } catch(e) {}
      }

      existingStories.unshift(newStory);
      await kv.put("stories", JSON.stringify(existingStories));
      
      incrementStat(kv, "actions", "approved").catch(() => {});

      const contactEmail = storedSuggestion?.contactEmail || extractEmailFromText(caption);
      const emailResult = contactEmail
        ? await sendApprovalEmailWithStatus(
            sendStoryApprovalEmail,
            contactEmail,
            {
              title,
              subtitle: storySubtitle,
              tag: storyTag,
              slides,
              imageUrl: permanentImageUrl,
              linkUrl: storyLinkUrl,
              siteUrl
            },
            runtimeEnv
          )
        : null;
      if (suggestionId) {
        await kv.delete(`story_suggestion:${suggestionId}`);
      }

      const adminName = cb.from.first_name || "Admin";
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const isTextReview = !!message.text;
      const originalReviewText = ((isTextReview ? message.text : message.caption) || "").split("\n---")[0];

      const storyStatusLine =
        emailResult?.status === "sent"
          ? `\n📧 <b>Approval email sent</b>\n<code>${formatEmailSendResult(emailResult.result)}</code>`
          : emailResult?.status === "failed"
            ? `\n⚠️ <b>Approval email failed</b>\n<code>${formatEmailFailureReason(emailResult.reason)}</code>`
            : "";

      const publishMarkup = {
        inline_keyboard: [
          [{ text: "🌐 View on Website", url: `${siteUrl}/feed` }]
        ]
      };
      const publishBody = JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: publishMarkup,
        ...(isTextReview
          ? { text: originalReviewText + `\n\n---\n✅ <b>Published</b> by ${adminName} at ${timeStr}${storyStatusLine}` }
          : { caption: originalReviewText + `\n\n---\n✅ <b>Published</b> by ${adminName} at ${timeStr}${storyStatusLine}` })
      });

      await fetch(`https://api.telegram.org/bot${botToken}/${isTextReview ? "editMessageText" : "editMessageCaption"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: publishBody
      });
      
      return json({ success: true });
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
