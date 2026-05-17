import { env } from '$env/dynamic/private';

type KvLike = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
};

type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

type SecurityEvent = {
  kind: string;
  severity: SecuritySeverity;
  message: string;
  details?: Record<string, unknown>;
  dedupeKey?: string;
  dedupeTtlSeconds?: number;
};

type SecurityPlatformEnv = App.Platform['env'];

function resolveKv(platformEnv?: SecurityPlatformEnv): KvLike | undefined {
  return (platformEnv?.AUTH_SECURITY_KV || platformEnv?.STORIES_KV) as KvLike | undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function redactEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return 'invalid-email';
  const localPrefix = local.length > 1 ? `${local[0]}***` : '*';
  return `${localPrefix}@${domain}`;
}

async function keyDigest(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function shouldSendAlert(
  platformEnv: SecurityPlatformEnv | undefined,
  dedupeKey: string | undefined,
  dedupeTtlSeconds: number
): Promise<boolean> {
  if (!dedupeKey) return true;

  const kv = resolveKv(platformEnv);
  if (!kv) return true;

  const digest = await keyDigest(dedupeKey);
  const key = `security:alert:${digest}`;
  const exists = await kv.get(key);
  if (exists) return false;

  await kv.put(key, '1', { expirationTtl: dedupeTtlSeconds });
  return true;
}

async function sendTelegramAlert(
  platformEnv: SecurityPlatformEnv | undefined,
  event: SecurityEvent
): Promise<void> {
  const botToken = platformEnv?.PRIVATE_TELEGRAM_BOT_TOKEN || env.PRIVATE_TELEGRAM_BOT_TOKEN;
  const chatId = platformEnv?.PRIVATE_TELEGRAM_CHAT_ID || env.PRIVATE_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  const dedupeTtlSeconds = event.dedupeTtlSeconds || 300;
  const canSend = await shouldSendAlert(platformEnv, event.dedupeKey, dedupeTtlSeconds);
  if (!canSend) return;

  const title = `${event.severity.toUpperCase()} • ${event.kind}`;
  const lines = [
    `🔐 <b>${escapeHtml(title)}</b>`,
    escapeHtml(event.message)
  ];

  if (event.details && Object.keys(event.details).length > 0) {
    lines.push(`<pre>${escapeHtml(JSON.stringify(event.details, null, 2))}</pre>`);
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join('\n\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  }).catch(() => {});
}

export async function emitSecurityEvent(
  platformEnv: SecurityPlatformEnv | undefined,
  event: SecurityEvent
): Promise<void> {
  const payload = {
    ts: new Date().toISOString(),
    kind: event.kind,
    severity: event.severity,
    message: event.message,
    details: event.details || {}
  };

  console.warn(`[security-event] ${JSON.stringify(payload)}`);

  if (event.severity === 'high' || event.severity === 'critical') {
    await sendTelegramAlert(platformEnv, event);
  }
}

export { redactEmail };
