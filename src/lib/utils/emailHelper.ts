export function getEmailUrl(email: string): string {
  if (typeof window === 'undefined') {
    // Fallback for Server-Side Rendering
    return `mailto:${email}`;
  }

  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // Handle iPads running iPadOS which identify as Macintosh
  const isIPad = /Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;

  if (isMobile || isIPad) {
    return `ms-outlook://compose?to=${email}`;
  } else {
    return `https://outlook.office.com/mail/deeplink/compose?to=${email}`;
  }
}
