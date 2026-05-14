import { env } from '$env/dynamic/private';
import { jwtVerify, SignJWT } from 'jose';

export const AUTH_COOKIE_NAME = 'campusweb_auth';
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24;
export const PIN_TTL_MS = 10 * 60 * 1000;
export const PIN_LENGTH = 6;

export type AuthPlatformEnv = {
  PRIVATE_AUTH_SECRET?: string;
};

export type AnonymousSessionPayload = {
  verified: true;
  role: 'srh_member';
};

function getSecret(platformEnv?: AuthPlatformEnv): Uint8Array {
  const secret = platformEnv?.PRIVATE_AUTH_SECRET || env.PRIVATE_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('PRIVATE_AUTH_SECRET must be set to a strong random value of at least 32 characters.');
  }

  return new TextEncoder().encode(secret);
}

function getSecretBuffer(platformEnv?: AuthPlatformEnv): ArrayBuffer {
  const bytes = getSecret(platformEnv);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function generatePin(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(PIN_LENGTH, '0');
}

export function getPinExpiration(): number {
  return Date.now() + PIN_TTL_MS;
}

export async function createPinHash(email: string, pin: string, expiresAt: number, platformEnv?: AuthPlatformEnv): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    getSecretBuffer(platformEnv),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = new TextEncoder().encode(`${email}\n${pin}\n${expiresAt}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return toBase64Url(signature);
}

export function constantTimeEqualBase64Url(a: string, b: string): boolean {
  const left = fromBase64Url(a);
  const right = fromBase64Url(b);

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

export async function createAnonymousSessionToken(platformEnv?: AuthPlatformEnv): Promise<string> {
  return new SignJWT({ verified: true, role: 'srh_member' } satisfies AnonymousSessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_SESSION_TTL_SECONDS}s`)
    .sign(getSecret(platformEnv));
}

export async function verifyAnonymousSessionToken(token: string | undefined, platformEnv?: AuthPlatformEnv): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(platformEnv));
    return payload.verified === true && payload.role === 'srh_member';
  } catch {
    return false;
  }
}
