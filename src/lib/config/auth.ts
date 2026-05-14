export const ALLOWED_DOMAINS = ['stud.srh-university.de', 'srh.de'] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }

  return normalized.slice(atIndex + 1);
}

export function isAllowedEmailDomain(email: string): boolean {
  const domain = getEmailDomain(email);

  if (!domain) {
    return false;
  }

  return ALLOWED_DOMAINS.some((allowedDomain) => (
    domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
  ));
}
