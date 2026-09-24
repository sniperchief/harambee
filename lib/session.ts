import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "./authCookie";
import { createServiceClient } from "./supabase";

export type SessionUser = {
  id: string;
  modular_wallet_address: string | null;
  passkey_credential_id: string | null;
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

/** A friendly display handle for a user, derived from their wallet. */
export function displayName(user: { modular_wallet_address: string | null }): string {
  return user.modular_wallet_address ?? "Member";
}
