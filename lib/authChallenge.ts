import { randomBytes } from "node:crypto";
import { createServiceClient } from "./supabase";

// One-time login challenges. Server-only. A challenge is a 32-byte random hex
// the browser must sign with its passkey; the server verifies that signature
// before issuing a session. Challenges are single-use and short-lived so a
// captured signature can't be replayed.

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function issueChallenge(): Promise<string> {
  const supabase = createServiceClient();
  const challenge = `0x${randomBytes(32).toString("hex")}`;

  await supabase.from("auth_challenges").insert({ challenge });

  // Opportunistic cleanup of stale challenges so the table can't grow unbounded.
  await supabase
    .from("auth_challenges")
    .delete()
    .lt("created_at", new Date(Date.now() - TTL_MS).toISOString());

  return challenge;
}

/** Returns true only if the challenge exists and is unexpired. Always deletes it (single-use). */
export async function consumeChallenge(challenge: string): Promise<boolean> {
  if (!challenge || typeof challenge !== "string") return false;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("auth_challenges")
    .select("created_at")
    .eq("challenge", challenge)
    .single();

  // Delete regardless of freshness so it can never be reused.
  await supabase.from("auth_challenges").delete().eq("challenge", challenge);

  if (!data) return false;
  return Date.now() - new Date(data.created_at).getTime() < TTL_MS;
}
