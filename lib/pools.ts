import type { SupabaseClient } from "@supabase/supabase-js";

/** Distinct confirmed-contributor count per pool id. */
export async function getContributorCounts(
  supabase: SupabaseClient,
  poolIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (poolIds.length === 0) return counts;

  const { data } = await supabase
    .from("pool_contributions")
    .select("pool_id, contributor_id")
    .in("pool_id", poolIds)
    .eq("status", "confirmed");

  const seen: Record<string, Set<string>> = {};
  for (const row of (data ?? []) as { pool_id: string; contributor_id: string | null }[]) {
    const key = row.contributor_id ?? "anon-" + Math.random();
    (seen[row.pool_id] ??= new Set()).add(key);
  }
  for (const id of poolIds) counts[id] = seen[id]?.size ?? 0;
  return counts;
}
