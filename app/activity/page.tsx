import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { Section } from "@/components/design/Section";
import { SurfaceCard, WarmCard } from "@/components/design/Card";
import { Tag } from "@/components/design/Tag";
import { getSessionUser, displayName } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { formatUsdc, formatDate, timeAgo, type PoolStatus } from "@/lib/format";

type EventType = "contribution" | "release" | "refund" | "created";

type TimelineEvent = {
  type: EventType;
  amount?: string;
  poolId: string;
  poolTitle: string;
  at: string;
};

// Outcomes read as Tags, in the same tones as the Pools table
// (see poolDisplay): Released in cream, Refunded in white.
const EVENTS: Record<EventType, { verb: string; tag?: { label: string; tone: "cream" | "white" } }> = {
  contribution: { verb: "Contribution to" },
  release: { verb: "Funds released for", tag: { label: "Released", tone: "cream" } },
  refund: { verb: "Refund available for", tag: { label: "Refunded", tone: "white" } },
  created: { verb: "You created" },
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
    <div className="min-h-screen">
      <TopNav walletAddress={user.modular_wallet_address} name={displayName(user)} />
      <main>
        <Section className="!pt-14" innerClassName="max-w-[880px]">
          <p className="type-eyebrow">Your ledger</p>
          <h1 className="type-display mt-3">Activity</h1>
          <p className="mt-4 text-body text-char">Every contribution, release and refund across your pools.</p>

          <div className="mt-12">
            {events.length === 0 ? (
              <WarmCard className="flex flex-col items-center py-20 text-center">
                <h3 className="type-heading-sm">No activity yet</h3>
                <p className="mt-3 max-w-sm text-body text-char">
                  Once you create or contribute to a pool, the history shows up here.
                </p>
              </WarmCard>
            ) : (
              <div className="space-y-12">
                {Array.from(groups.entries()).map(([day, items]) => (
                  <div key={day}>
                    <p className="mb-4 font-dm-mono text-sm text-char">{day}</p>
                    <SurfaceCard flush className="px-8">
                      <ul>
                        {items.map((e, i) => {
                          const ev = EVENTS[e.type];
                          return (
                            <li key={i} className="ledger-row">
                              <Link
                                href={`/pools/${e.poolId}`}
                                className="flex items-center justify-between gap-4 py-5 no-underline hover:underline hover:underline-offset-4"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-body">
                                    <span className="text-char">{ev.verb}</span>{" "}
                                    <span className="font-medium">{e.poolTitle}</span>
                                  </span>
                                  <span className="text-sm text-char">{timeAgo(e.at)}</span>
                                </span>
                                {e.amount ? (
                                  <span className="font-dm-mono text-lg tnum">+${formatUsdc(e.amount)}</span>
                                ) : ev.tag ? (
                                  <Tag tone={ev.tag.tone} small>{ev.tag.label}</Tag>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </SurfaceCard>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </main>
    </div>
  );
}
