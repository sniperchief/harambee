import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { PoolsExplorer } from "@/components/PoolsExplorer";
import { ButtonLink } from "@/components/ui/Button";
import { getSessionUser, displayName } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { getContributorCounts } from "@/lib/pools";
import type { PoolSummary } from "@/components/PoolCard";

function PlusIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
}

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

  const allIds = Array.from(new Set([...createdPools, ...contributedPools].map((p) => p.id)));
  const counts = await getContributorCounts(supabase, allIds);
  const withCounts = (list: PoolSummary[]) =>
    list.map((p) => ({ ...p, contributor_count: counts[p.id] ?? 0 }));

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav walletAddress={user.modular_wallet_address} name={displayName(user)} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy">Pools</h1>
          </div>
          <ButtonLink href="/pools/new" className="self-start sm:self-auto">
            <PlusIcon />
            Create a pool
          </ButtonLink>
        </div>
        <div className="mt-8">
          <PoolsExplorer created={withCounts(createdPools)} contributed={withCounts(contributedPools)} />
        </div>
      </main>
    </div>
  );
}
