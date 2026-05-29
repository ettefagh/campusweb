export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  linkUrl: string;
  sponsorName?: string;
  campusIds: string[]; // ["all"] or specific
  startsAt?: string;
  expiresAt?: string;
  label: string; // Any string, e.g. "Bestseller", "Student Offer"
  cta?: string;
  priority: number;
}

export function isPromotionActive(promotion: Promotion, now = new Date()) {
  if (promotion.startsAt && new Date(promotion.startsAt) > now) return false;
  if (promotion.expiresAt && new Date(promotion.expiresAt) <= now) return false;
  return true;
}

export const promotions: Promotion[] = [];
