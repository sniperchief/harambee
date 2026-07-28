import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionUser, displayName } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { formatUsdc, formatDate, timeAgo, statusMeta, type PoolStatus } from "@/lib/format";

type EventType = "contribution" | "release" | "refund" | "created";

type TimelineEvent = {
  type: EventType;
  amount?: string;
  poolId: string;
  poolTitle: string;
  at: string;
};

const ICONS: Record<EventType, { bg: string; fg: string; path: React.ReactNode; verb: string }> = {
  contribution: {
    bg: "bg-brand-50",
    fg: "text-brand-600",
    verb: "Contribution to",
    path: <path d="M12 5v14M5 12l7 7 7-7" />,
  },
  release: {
    bg: "bg-success-50",
    fg: "text-success",
    verb: "Funds released for",
    path: <path d="M20 6 9 17l-5-5" />,
  },
  refund: {
    bg: "bg-warning-50",
    fg: "text-[#b45309]",
    verb: "Refund available for",
    path: <path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.74 2.74L3 8M3 3v5h5" />,
  },
  created: {
    bg: "bg-surface-2",
    fg: "text-muted",
    verb: "You created",
    path: <path d="M12 5v14M5 12h14" />,
  },
};

export default async function ActivityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/activity");

  const supabase = createServiceClient();

  const { data: createdRaw } = await supabase
    .from("pools")
    .select("id, title, status, created_at")
    .eq("creator_id", user.id);
  const created = (createdRaw ?? []) as { id: string; title: string; status: PoolStatus; created_at: string }[];

  const { data: contribRows } = (await supabase
    .from("pool_contributions")
    .select("amount, created_at, pool_id, pools(id, title)")
    .eq("contributor_id", user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })) as unknown as {
    data: { amount: string; created_at: string; pool_id: string; pools: { id: string; title: string } | null }[] | null;
  };

  const events: TimelineEvent[] = [];

  for (const c of contribRows ?? []) {
    events.push({
      type: "contribution",
      amount: c.amount,
      poolId: c.pools?.id ?? c.pool_id,
      poolTitle: c.pools?.title ?? "Pool",
      at: c.created_at,
    });
  }
  for (const p of created) {
    events.push({ type: "created", poolId: p.id, poolTitle: p.title, at: p.created_at });
    if (p.status === "released") events.push({ type: "release", poolId: p.id, poolTitle: p.title, at: p.created_at });
    if (p.status === "refunded") events.push({ type: "refund", poolId: p.id, poolTitle: p.title, at: p.created_at });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // Group by day
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const key = formatDate(e.at);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav walletAddress={user.modular_wallet_address} name={displayName(user)} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <h1 className="text-3xl font-bold tracking-tight text-navy">Activity</h1>
        <p className="mt-1 text-[15px] text-muted">Every contribution, release and refund across your pools.</p>

        <div className="mt-8">
          {events.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Once you create or contribute to a pool, the history shows up here."
            />
          ) : (
            <div className="space-y-8">
              {Array.from(groups.entries()).map(([day, items]) => (
                <div key={day}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{day}</p>
                  <Card className="divide-y divide-line">
                    {items.map((e, i) => {
                      const ic = ICONS[e.type];
                      const meta = statusMeta((e.type === "release" ? "released" : e.type === "refund" ? "refunded" : "open") as PoolStatus);
                      return (
                        <Link key={i} href={`/pools/${e.poolId}`} className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-surface-2/60">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ic.bg} ${ic.fg}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{ic.path}</svg>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">
                              <span className="text-muted">{ic.verb}</span> <span className="font-semibold">{e.poolTitle}</span>
                            </p>
                            <p className="text-xs text-muted">{timeAgo(e.at)}</p>
                          </div>
                          {e.amount ? (
                            <span className="text-sm font-semibold text-ink tnum">+${formatUsdc(e.amount)}</span>
                          ) : e.type !== "created" ? (
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          ) : null}
                        </Link>
                      );
                    })}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
