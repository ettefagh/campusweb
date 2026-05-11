import { socialAccounts } from "./socialAccounts";
import { promotions, isPromotionActive } from "./promotions";
import { t } from "$lib/i18n";
import { get } from "svelte/store";

export type FeedItemType =
  | "story_rail" // Special type for the rail
  | "official_account"
  | "club"
  | "promotion"
  | "news"
  | "event";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  campusIds?: string[];
  schoolIds?: string[];
  tags?: string[];
  priority?: number;
  startsAt?: string;
  expiresAt?: string;
  source?: string;
  // Metadata for rendering
  data?: any; 
}

/**
 * Normalizes all disparate data sources into a single feed stream.
 */
export function getNormalizedFeed(campusId: string | null): FeedItem[] {
  const resolvedCampusId = campusId ?? "all";
  const items: FeedItem[] = [];
  const i18n = get(t);

  // 1. Official Social Accounts (mapped to FeedItem)
  socialAccounts
    .filter(acc => acc.type === "official" && (acc.campusIds.includes("all") || acc.campusIds.includes(resolvedCampusId)))
    .forEach(acc => {
      items.push({
        id: acc.id,
        type: "official_account",
        title: acc.name,
        subtitle: `@${acc.handle}`,
        linkUrl: acc.url,
        priority: acc.priority,
        campusIds: acc.campusIds,
        data: acc
      });
    });

  // 2. Student Clubs
  socialAccounts
    .filter(acc => acc.type === "club" && (acc.campusIds.includes("all") || acc.campusIds.includes(resolvedCampusId)))
    .forEach(acc => {
      items.push({
        id: acc.id,
        type: "club",
        title: acc.name,
        subtitle: `@${acc.handle}`,
        linkUrl: acc.url,
        priority: acc.priority,
        campusIds: acc.campusIds,
        data: acc
      });
    });

  // 3. Promotions
  promotions
    .filter(promo => isPromotionActive(promo) && (promo.campusIds.includes("all") || promo.campusIds.includes(resolvedCampusId)))
    .forEach(promo => {
      items.push({
        id: promo.id,
        type: "promotion",
        title: promo.title,
        subtitle: promo.subtitle,
        linkUrl: promo.linkUrl,
        priority: promo.priority,
        campusIds: promo.campusIds,
        data: promo
      });
    });

  // 4. News & Events (the cards)
  items.push({
    id: "news-grid",
    type: "news",
    title: i18n.feed.newsTitle,
    priority: 5,
    campusIds: ["all"]
  });

  return items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
