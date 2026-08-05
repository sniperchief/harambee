import Link from "next/link";
import { LocalAmount } from "@/components/LocalAmount";
import {
  formatUsdc,
  progressPercent,
  statusMeta,
  timeUntil,
  type PoolStatus,
} from "@/lib/format";

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

function LeafIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// Status-tinted dark cards, one cohesive deep/desaturated family. Text stays
// white throughout; the background, progress fill, and status dot shift by
// status so the outcome reads at a glance without going rainbow.
const CARD_THEME: Record<PoolStatus, { bg: string; bar: string; dot: string }> = {
  open: { bg: "bg-navy", bar: "bg-brand", dot: "bg-brand" },
  released: { bg: "bg-[#0e3a2e]", bar: "bg-success", dot: "bg-success" },
  refunded: { bg: "bg-[#2a303c]", bar: "bg-white/70", dot: "bg-white/50" },
  cancelled: { bg: "bg-[#242a34]", bar: "bg-white/45", dot: "bg-white/40" },
};

export function PoolCard({ pool }: { pool: PoolSummary }) {
  const status = statusMeta(pool.status);
  const pct = progressPercent(pool.current_amount, pool.target_amount);
  const time = timeUntil(pool.deadline);
  const isOpen = pool.status === "open";
  const count = pool.contributor_count ?? 0;
  const theme = CARD_THEME[pool.status] ?? CARD_THEME.open;

  return (
    <Link
      href={`/pools/${pool.id}`}
      className={`group block rounded-[18px] shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg ${theme.bg}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-white line-clamp-2">
            {pool.title}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
            {status.label}
          </span>
        </div>

        {pool.description && (
          <p className="mt-1.5 text-sm text-white/55 line-clamp-1">{pool.description}</p>
        )}

        <div className="mt-5">
          <div className="flex items-end justify-between gap-2">
            <p className="text-[22px] font-semibold leading-none tracking-tight text-white tnum">
              ${formatUsdc(pool.current_amount)}
            </p>
            <p className="text-sm text-white/50 tnum">
              of ${formatUsdc(pool.target_amount)}
              <LocalAmount value={pool.target_amount} currency={pool.target_currency} prefix=" · " />
            </p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${theme.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-white/55 tnum">{Math.round(pct)}% funded</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-medium text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon />
            {count} {count === 1 ? "contributor" : "contributors"}
          </span>
          {isOpen ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <LeafIcon />
              Earning yield
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon />
              {status.label}
            </span>
          )}
          {isOpen && (
            <span className={`inline-flex items-center gap-1.5 ${time.urgent ? "text-warning" : "text-white/60"}`}>
              <ClockIcon />
              {time.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
