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
