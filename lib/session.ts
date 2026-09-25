import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "./authCookie";
import { createServiceClient } from "./supabase";

export type SessionUser = {
  id: string;
  modular_wallet_address: string | null;
  passkey_credential_id: string | null;
  /** Chosen at sign-up (or in Settings). Absent on older accounts / before the 0008 migration. */
  username?: string | null;
  created_at: string;
};

/** The logged-in user's id from a verified session cookie, or null. Server-only. */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return readSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Returns the logged-in user row, or null. Server-only. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const supabase = createServiceClient();
  const { data } = await supabase.from("users").select().eq("id", userId).single();
  return (data as SessionUser) ?? null;
}

/** The user's chosen username, or null if they haven't set one. Never the wallet address. */
export function displayName(user: { username?: string | null }): string | null {
  return user.username?.trim() || null;
}
