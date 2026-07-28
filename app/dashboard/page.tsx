import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { PoolCard, type PoolSummary } from "@/components/PoolCard";
import { BalanceBand } from "@/components/BalanceBand";
import { YieldStat } from "@/components/YieldStat";
import { StatCard } from "@/components/ui/Stat";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionUser, displayName } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { getContributorCounts } from "@/lib/pools";
import { formatUsdc, timeAgo } from "@/lib/format";

function WalletIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M17 12h.01"/></svg>;
}
function StackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></svg>;
}
function PlusIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = createServiceClient();

  const { data: createdRaw } = await supabase
    .from("pools")
    .select()
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const created = (createdRaw ?? []) as (PoolSummary & { created_at: string; creator_id: string })[];
  const ids = created.map((p) => p.id);

  type Contrib = { amount: string; created_at: string; pool_id: string; status: string };

  // Contributor counts and recent activity both depend on `created` but not on
  // each other — run them together instead of one after the other.
  const [counts, contribsRes] = await Promise.all([
    getContributorCounts(supabase, ids),
    ids.length
      ? supabase
          .from("pool_contributions")
          .select("amount, created_at, pool_id, status")
          .in("pool_id", ids)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as Contrib[] }),
  ]);

  const totalRaised = created.reduce((sum, p) => sum + Number(p.current_amount), 0);
  const activeCount = created.filter((p) => p.status === "open").length;
  const releasedCount = created.filter((p) => p.status === "released").length;

  const titleById = new Map(created.map((p) => [p.id, p.title]));
  const activity = (((contribsRes as { data: Contrib[] | null }).data) ?? []).map((c) => ({
    ...c,
    poolTitle: titleById.get(c.pool_id) ?? "Pool",
  }));

  const recent = created.slice(0, 4).map((p) => ({ ...p, contributor_count: counts[p.id] ?? 0 }));

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav walletAddress={user.modular_wallet_address} name={displayName(user)} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Welcome */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy">Your pools</h1>
          </div>
          <ButtonLink href="/pools/new" className="self-start sm:self-auto">
            <PlusIcon />
            Create a pool
          </ButtonLink>
        </div>

        {/* Available balance — full-width hero */}
        <BalanceBand />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Left: stats + recent pools */}
          <div className="space-y-8 lg:col-span-2">
            {/* Stats — 2x2, larger */}
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Total raised"
                value={<>${formatUsdc(totalRaised)}</>}
                sub="Across all your pools"
                icon={<WalletIcon />}
                tone="brand"
                size="lg"
              />
              <YieldStat activeCount={activeCount} />
              <StatCard label="Active pools" value={activeCount} sub="Currently collecting" icon={<StackIcon />} size="lg" />
              <StatCard label="Completed" value={releasedCount} sub="Goals reached & released" icon={<StackIcon />} tone="success" size="lg" />
            </div>

            {/* Recent pools — 4, then View all */}
            <section>
              <h2 className="text-lg font-semibold text-ink">Recent pools</h2>
              <div className="mt-4">
                {recent.length === 0 ? (
                  <EmptyState
                    icon={<StackIcon />}
                    title="No pools yet"
                    description="Create your first pool and share the link. It takes about a minute."
                    action={<ButtonLink href="/pools/new"><PlusIcon /> Create a pool</ButtonLink>}
                  />
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {recent.map((p) => (
                        <PoolCard key={p.id} pool={p} />
                      ))}
                    </div>
                    <ButtonLink href="/pools" variant="secondary" className="mt-4 w-full">
                      View all pools
                    </ButtonLink>
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Right: activity sidebar */}
          <section className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-ink">Activity</h2>
              <div className="mt-4 rounded-[18px] border border-line bg-surface p-2 shadow-xs">
              {activity.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  Contributions will appear here as they arrive.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 px-3 py-3.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-50 text-success">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          <span className="font-semibold">+${formatUsdc(a.amount)}</span> to{" "}
                          <span className="text-muted">{a.poolTitle}</span>
                        </p>
                        <p className="text-xs text-muted">{timeAgo(a.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
