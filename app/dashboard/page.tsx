import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { PoolTable, type PoolSummary } from "@/components/PoolTable";
import { BalanceBand } from "@/components/BalanceBand";
import { Greeting } from "@/components/Greeting";
import { Section } from "@/components/design/Section";
import { SurfaceCard, WarmCard } from "@/components/design/Card";
import { PillLink } from "@/components/design/PillButton";
import { getSessionUser, displayName } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { getContributorCounts } from "@/lib/pools";
import { formatUsdc, shortAddress, timeAgo } from "@/lib/format";

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <SurfaceCard className="min-w-0 !p-6">
      <p className="text-[15px] text-char">{label}</p>
      <p className="mt-2 font-champ text-[clamp(32px,4vw,40px)] font-extrabold leading-none tnum [overflow-wrap:anywhere]">{value}</p>
      <p className="mt-2 text-sm text-char">{sub}</p>
    </SurfaceCard>
  );
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

  type Contrib = {
    amount: string;
    created_at: string;
    pool_id: string;
    status: string;
    users: { modular_wallet_address: string | null } | null;
  };

  // Contributor counts and recent activity both depend on `created` but not on
  // each other — run them together instead of one after the other.
  const [counts, contribsRes] = await Promise.all([
    getContributorCounts(supabase, ids),
    ids.length
      ? supabase
          .from("pool_contributions")
          .select("amount, created_at, pool_id, status, users(modular_wallet_address)")
          .in("pool_id", ids)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as Contrib[] }),
  ]);

  const totalRaised = created.reduce((sum, p) => sum + Number(p.current_amount), 0);
  const activeCount = created.filter((p) => p.status === "open").length;
  const releasedCount = created.filter((p) => p.status === "released").length;

  const titleById = new Map(created.map((p) => [p.id, p.title]));
  const ledger = (((contribsRes as unknown as { data: Contrib[] | null }).data) ?? []).map((c) => ({
    ...c,
    poolTitle: titleById.get(c.pool_id) ?? "Pool",
    from: c.users?.modular_wallet_address ?? null,
  }));

  const recent = created.slice(0, 4).map((p) => ({ ...p, contributor_count: counts[p.id] ?? 0 }));
  const name = displayName(user);

  return (
    <div className="min-h-screen">
      <TopNav walletAddress={user.modular_wallet_address} name={name} />

      <main>
        <Section className="!pt-14">
          {/* Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Greeting name={name} className="type-eyebrow" />
              <h1 className="type-display mt-3">Your pools</h1>
            </div>
            <PillLink href="/pools/new" className="self-start !border-ink-black sm:self-auto">
              + Create a pool
            </PillLink>
          </div>

          {/* Balance */}
          <div className="mt-8">
            <BalanceBand address={user.modular_wallet_address} />
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
            {/* Left: stats + recent pools */}
            <div className="space-y-12 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Total raised" value={`$${formatUsdc(totalRaised, { decimals: 0 })}`} sub="Across all your pools" />
                <Stat label="Active pools" value={activeCount} sub="Collecting now" />
                <Stat label="Completed" value={releasedCount} sub="Released to recipients" />
              </div>

              <section>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="font-champ text-[30px] font-extrabold leading-tight">Recent pools</h2>
                  {recent.length > 0 && (
                    <Link href="/pools" className="border-b-[1.5px] border-ink-black pb-0.5 text-body no-underline">
                      View all
                    </Link>
                  )}
                </div>
                <div className="mt-5">
                  {recent.length === 0 ? (
                    <WarmCard className="flex flex-col items-center py-16 text-center">
                      <h3 className="type-heading-sm">No pools yet</h3>
                      <p className="mt-3 max-w-sm text-body text-char">
                        Create your first pool and share the link. It takes about a minute.
                      </p>
                    </WarmCard>
                  ) : (
                    <PoolTable pools={recent} />
                  )}
                </div>
              </section>
            </div>

            {/* Right: ledger */}
            <section>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-champ text-[30px] font-extrabold leading-tight">Ledger</h2>
                <Link href="/activity" className="border-b-[1.5px] border-ink-black pb-0.5 text-body no-underline">
                  View all
                </Link>
              </div>
              <SurfaceCard className="mt-5 !px-6 !py-2">
                {ledger.length === 0 ? (
                  <p className="py-10 text-center text-body text-char">Contributions will appear here as they arrive.</p>
                ) : (
                  <ul>
                    {ledger.map((c, i) => (
                      <li key={i} className="border-b border-dashed border-oat last:border-b-0">
                        <Link
                          href={`/pools/${c.pool_id}`}
                          className="flex items-start justify-between gap-4 py-4 no-underline"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-body">{c.poolTitle}</span>
                            <span className="mt-0.5 block font-dm-mono text-xs text-char">
                              {c.from ? shortAddress(c.from) : "Anonymous"} · {timeAgo(c.created_at)}
                            </span>
                          </span>
                          <span className="shrink-0 font-dm-mono text-body font-medium tnum">
                            +${formatUsdc(c.amount)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SurfaceCard>
            </section>
          </div>
        </Section>
      </main>
    </div>
  );
}
