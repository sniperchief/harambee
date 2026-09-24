// Username rules, shared by sign-up (client), the API routes and Settings.
// Circle accepts 5–50 chars from [A-Za-z0-9_@.:+-] for the passkey name; we cap
// at 15 for tidier handles (a stricter subset Circle still accepts).
export const USERNAME_PATTERN = /^[A-Za-z0-9_@.:+-]{5,15}$/;

export function normalizeUsername(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function isValidUsername(name: string): boolean {
  return USERNAME_PATTERN.test(name);
}

/** Why a username is invalid, in plain words — or null if it's fine. */
export function usernameProblem(name: string): string | null {
  if (!name) return "Choose a username.";
  if (/[^A-Za-z0-9_@.:+-]/.test(name)) return "Letters, numbers, dots, dashes and underscores only — no spaces.";
  if (name.length < 5) return "Just a bit longer — at least 5 characters.";
  if (name.length > 15) return "Keep it to 15 characters or fewer.";
  return null;
}
