import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "harambee_session";

// Single source of truth for the session cookie's security attributes.
// httpOnly: not readable by JS (XSS can't steal it).
// sameSite lax: not sent on cross-site requests (CSRF mitigation).
// secure in production: HTTPS-only.
// maxAge: persistent for 30 days instead of a browser-session cookie.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  }
  return secret;
}

function sign(userId: string): string {
  return createHmac("sha256", getSessionSecret()).update(userId).digest("base64url");
}

// The cookie is "<userId>.<HMAC(userId)>". User ids are not secret (they
// appear in pool data), so the signature is what proves the server issued
// this session after a verified passkey login.
export function createSessionValue(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Returns the user id from a session cookie value, or null if it's missing or forged. */
export function readSessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(userId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}
