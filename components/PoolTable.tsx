import Link from "next/link";
import { Tag, type TagTone } from "@/components/design/Tag";
import { Meter } from "@/components/design/Meter";
import { formatUsdc, progressPercent, timeUntil, type PoolStatus } from "@/lib/format";

export type PoolSummary = {
  id: string;
  title: string;
  description: string | null;
  target_amount: string | number;
  current_amount: string | number;
  deadline: string;
  status: PoolStatus;
  target_currency: string | null;
  contributor_count?: number;
};

export type PoolDisplay = { label: string; tone: TagTone; meter: "ink" | "char" | "oat"; timing: string };

// How a pool reads at a glance, everywhere it appears: live pools in ink
// (Marigold "Closing soon" in the last 3 days), released in cream with a char
// bar, refunded / ended in white. Pass `ended` when the caller knows the pool
// has stopped taking contributions even though its status still reads "open".
export function poolDisplay(status: PoolStatus, deadline: string, ended = false): PoolDisplay {
  const time = timeUntil(deadline);
  switch (status) {
    case "open":
      if (ended || time.past) return { label: "Ended", tone: "white", meter: "oat", timing: "Ended" };
      return time.urgent
        ? { label: "Closing soon", tone: "marigold", meter: "ink", timing: time.label }
        : { label: "Open", tone: "black", meter: "ink", timing: time.label };
    case "released":
      return { label: "Released", tone: "cream", meter: "char", timing: "Released" };
    case "refunded":
      return { label: "Refunded", tone: "white", meter: "oat", timing: "Ended" };
    default:
      return { label: "Cancelled", tone: "white", meter: "oat", timing: "Cancelled" };
  }
}

const COLS = "md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.6fr)] md:items-center md:gap-6";

/** Pools as a ledger: a white card with a mono header row and dashed rules. */
export function PoolTable({ pools }: { pools: PoolSummary[] }) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-bone-white">
      <div className={`hidden border-b border-ink-black px-6 py-5 text-char ${COLS}`}>
        <span className="type-eyebrow !text-xs">Pool</span>
        <span className="type-eyebrow !text-xs">Progress</span>
        <span className="type-eyebrow !text-xs">Raised</span>
        <span className="type-eyebrow !text-xs">Status</span>
      </div>
      <ul>
        {pools.map((pool) => {
          const s = poolDisplay(pool.status, pool.deadline);
          const pct = progressPercent(pool.current_amount, pool.target_amount);
          const count = pool.contributor_count ?? 0;
          return (
            <li key={pool.id} className="border-b border-dashed border-oat last:border-b-0">
              <Link
                href={`/pools/${pool.id}`}
                className={`flex flex-col gap-4 px-6 py-6 no-underline transition-colors hover:bg-[#fffbea] ${COLS}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-champ text-[20px] font-bold leading-tight">{pool.title}</p>
                    <p className="mt-1 text-sm text-char">
                      {count} {count === 1 ? "contributor" : "contributors"} · {s.timing}
                    </p>
                  </div>
                  <Tag tone={s.tone} small className="md:hidden">
                    {s.label}
                  </Tag>
                </div>
                <div>
                  <Meter value={pct} tone={s.meter} label={`${Math.round(pct)}% funded`} />
                  <p className="mt-2 font-dm-mono text-xs text-char">
                    {Math.round(pct)}% of ${formatUsdc(pool.target_amount, { decimals: 0 })}
                  </p>
                </div>
                <p className="font-dm-mono text-lg font-medium tnum">${formatUsdc(pool.current_amount)}</p>
                <div className="hidden md:block">
                  <Tag tone={s.tone} small>
                    {s.label}
                  </Tag>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
