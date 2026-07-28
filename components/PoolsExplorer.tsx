"use client";

import { useMemo, useState } from "react";
import { PoolCard, type PoolSummary } from "@/components/PoolCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

type Tab = "all" | "open" | "released" | "refunded";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "released", label: "Released" },
  { key: "refunded", label: "Refunded" },
];

// Dots echo the status-tinted card backgrounds (navy / emerald / slate).
const TAB_DOT: Record<string, string> = {
  open: "bg-navy",
  released: "bg-[#0e3a2e]",
  refunded: "bg-[#2a303c]",
};

export function PoolsExplorer({ pools }: { pools: (PoolSummary & { role?: string })[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: pools.length, open: 0, released: 0, refunded: 0 };
    for (const p of pools) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [pools]);

  const filtered = useMemo(() => {
    return pools.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [pools, tab, query]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-[12px] border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-brand text-navy" : "text-muted hover:text-ink"
              }`}
            >
              {t.key !== "all" && (
                <span className={`h-2 w-2 rounded-full ${TAB_DOT[t.key]}`} />
              )}
              {t.label}
              <span className={`tnum text-xs ${tab === t.key ? "text-navy/60" : "text-muted/70"}`}>
                {counts[t.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pools"
            className="h-10 w-full rounded-[12px] border border-line bg-surface pl-9 pr-3 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 sm:w-64 sm:text-sm"
          />
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            title={query ? "No pools match your search" : "Nothing here yet"}
            description={query ? "Try a different name." : "Pools you create or contribute to will show up here."}
            action={<ButtonLink href="/pools/new">Create a pool</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PoolCard key={p.id} pool={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
