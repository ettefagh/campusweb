/**
 * Utility for handling university phone numbers, especially those with extensions
 * or complex "function number" formats like +49 30 515650-800.
 */

export interface PhoneAction {
  label: string;
  tel: string;
  formatted: string;
}

/**
 * Parses a phone number string and returns one or more dialable actions.
 * Handles German extension formats (e.g., -xxx) and potentially range-replacement formats.
 */
export function getPhoneActions(phone: string): PhoneAction[] {
  if (!phone) return [];

  const clean = (s: string) => s.replace(/[\s-]/g, '');

  // If there's no hyphen, it's a simple number
  if (!phone.includes('-')) {
    return [{
      label: 'Call',
      tel: 'tel:' + clean(phone),
      formatted: phone
    }];
  }

  const parts = phone.split('-');
  const base = parts[0].trim();
  const ext = parts[1].trim();

  const actions: PhoneAction[] = [];

  // 1. Direct dial (Standard: Base + Extension)
  // This is the most likely intended behavior for modern PBX systems.
  const directTel = 'tel:' + clean(phone);
  actions.push({
    label: 'Extension',
    tel: directTel,
    formatted: phone
  });

  // 2. Base number dial (Call the main office/reception)
  const baseTel = 'tel:' + clean(base);
  if (baseTel !== directTel) {
    actions.push({
      label: 'Office',
      tel: baseTel,
      formatted: base
    });
  }

  return actions;
}

/**
 * Returns the most direct dialable phone link (usually the one with extension).
 */
export function getDirectPhone(phone: string): string | null {
  if (!phone) return null;
  const actions = getPhoneActions(phone);
  return actions[0]?.tel || null;
}

/**
 * Generates a Microsoft Teams chat deep link for a given email address.
 */
export function getTeamsChatUrl(email: string): string {
  if (!email) return '';
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
}
