type AttemptBucket = {
  count: number;
  windowStart: number;
  lockUntil: number;
};

type KvLike = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

const memoryAttemptBuckets = new Map<string, AttemptBucket>();
const memoryUsedChallenges = new Map<string, number>();

const ATTEMPT_PREFIX = 'auth:verify:attempt:';
const CHALLENGE_PREFIX = 'auth:verify:challenge:';

function b64url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return b64url(new Uint8Array(digest));
}

function resolveKv(platformEnv?: App.Platform['env']): KvLike | undefined {
  return (platformEnv?.AUTH_SECURITY_KV || platformEnv?.STORIES_KV) as KvLike | undefined;
}

async function getAttemptBucket(kv: KvLike | undefined, key: string): Promise<AttemptBucket | null> {
  if (!kv) {
    return memoryAttemptBuckets.get(key) || null;
  }

  const digest = await hashKey(key);
  const raw = await kv.get(`${ATTEMPT_PREFIX}${digest}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AttemptBucket;
    if (
      typeof parsed.count !== 'number' ||
      typeof parsed.windowStart !== 'number' ||
      typeof parsed.lockUntil !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function putAttemptBucket(
  kv: KvLike | undefined,
  key: string,
  value: AttemptBucket,
  ttlSeconds: number
): Promise<void> {
  if (!kv) {
    memoryAttemptBuckets.set(key, value);
    return;
  }

  const digest = await hashKey(key);
  await kv.put(`${ATTEMPT_PREFIX}${digest}`, JSON.stringify(value), { expirationTtl: ttlSeconds });
}

async function deleteAttemptBucket(kv: KvLike | undefined, key: string): Promise<void> {
  if (!kv) {
    memoryAttemptBuckets.delete(key);
    return;
  }

  const digest = await hashKey(key);
  await kv.delete(`${ATTEMPT_PREFIX}${digest}`);
}

async function challengeIsUsed(kv: KvLike | undefined, key: string, now: number): Promise<boolean> {
  if (!kv) {
    const expiresAt = memoryUsedChallenges.get(key);
    if (!expiresAt) return false;
    if (expiresAt <= now) {
      memoryUsedChallenges.delete(key);
      return false;
    }
    return true;
  }

  const digest = await hashKey(key);
  const marker = await kv.get(`${CHALLENGE_PREFIX}${digest}`);
  return marker !== null;
}

async function markChallengeUsed(
  kv: KvLike | undefined,
  key: string,
  now: number,
  ttlSeconds: number
): Promise<void> {
  if (!kv) {
    memoryUsedChallenges.set(key, now + ttlSeconds * 1000);
    return;
  }

  const digest = await hashKey(key);
  await kv.put(`${CHALLENGE_PREFIX}${digest}`, '1', { expirationTtl: ttlSeconds });
}

export async function isLockedOut(
  platformEnv: App.Platform['env'] | undefined,
  key: string,
  now: number
): Promise<boolean> {
  const bucket = await getAttemptBucket(resolveKv(platformEnv), key);
  if (!bucket) return false;
  return bucket.lockUntil > now;
}

export async function markFailedAttempt(
  platformEnv: App.Platform['env'] | undefined,
  key: string,
  now: number,
  maxFailedAttempts: number,
  attemptWindowMs: number
): Promise<void> {
  const kv = resolveKv(platformEnv);
  const current = await getAttemptBucket(kv, key);
  let next: AttemptBucket;

  if (!current || now - current.windowStart > attemptWindowMs) {
    next = { count: 1, windowStart: now, lockUntil: 0 };
  } else {
    next = { ...current, count: current.count + 1 };
    if (next.count >= maxFailedAttempts) {
      next.lockUntil = now + attemptWindowMs;
    }
  }

  const ttlSeconds = Math.ceil((attemptWindowMs * 2) / 1000);
  await putAttemptBucket(kv, key, next, ttlSeconds);
}

export async function clearFailedAttempts(
  platformEnv: App.Platform['env'] | undefined,
  key: string
): Promise<void> {
  await deleteAttemptBucket(resolveKv(platformEnv), key);
}

export async function isReplayChallengeUsed(
  platformEnv: App.Platform['env'] | undefined,
  key: string,
  now: number
): Promise<boolean> {
  return challengeIsUsed(resolveKv(platformEnv), key, now);
}

export async function markReplayChallengeUsed(
  platformEnv: App.Platform['env'] | undefined,
  key: string,
  now: number,
  ttlMs: number
): Promise<void> {
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  await markChallengeUsed(resolveKv(platformEnv), key, now, ttlSeconds);
}
