import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { PoolsExplorer } from "@/components/PoolsExplorer";
import { Section } from "@/components/design/Section";
import { getSessionUser, displayName } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { getContributorCounts } from "@/lib/pools";
import type { PoolSummary } from "@/components/PoolTable";

export default async function PoolsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/pools");

  const supabase = createServiceClient();

  const { data: createdRaw } = await supabase
    .from("pools")
    .select()
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const { data: contribRows } = (await supabase
    .from("pool_contributions")
    .select("pools(*)")
    .eq("contributor_id", user.id)
    .eq("status", "confirmed")) as unknown as { data: { pools: PoolSummary | null }[] | null };

  const createdPools = (createdRaw ?? []) as PoolSummary[];

  // A pool the user contributed to (deduped — they may have contributed twice).
  const contributedById = new Map<string, PoolSummary>();
  for (const row of contribRows ?? []) {
    if (row.pools) contributedById.set(row.pools.id, row.pools);
  }
  const contributedPools = Array.from(contributedById.values());

  // One list: every pool the user created or chipped into, deduped, newest first.
  const byId = new Map<string, PoolSummary & { created_at?: string }>();
  for (const p of [...createdPools, ...contributedPools]) byId.set(p.id, p);
  const all = Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
  const counts = await getContributorCounts(supabase, all.map((p) => p.id));
  const pools = all.map((p) => ({ ...p, contributor_count: counts[p.id] ?? 0 }));

  return (
    <div className="min-h-screen">
      <TopNav walletAddress={user.modular_wallet_address} name={displayName(user)} />
      <main>
        <Section className="!pt-10">
          <PoolsExplorer pools={pools} />
        </Section>
      </main>
    </div>
  );
}
