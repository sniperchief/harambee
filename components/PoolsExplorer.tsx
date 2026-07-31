"use client";

import { useMemo, useState } from "react";
import { PoolCard, type PoolSummary } from "@/components/PoolCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

type StatusTab = "all" | "open" | "released" | "refunded";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
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

export function PoolsExplorer({
  created,
  contributed,
}: {
  created: PoolSummary[];
  contributed: PoolSummary[];
}) {
  const hasContributed = contributed.length > 0;
  const [source, setSource] = useState<"created" | "contributed">("created");
  const [status, setStatus] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");

  const activeList = source === "contributed" && hasContributed ? contributed : created;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: activeList.length, open: 0, released: 0, refunded: 0 };
    for (const p of activeList) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [activeList]);

  const filtered = useMemo(() => {
    return activeList.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [activeList, status, query]);

  return (
    <div>
      {/* Created / Contributed — only offer the split once they've contributed. */}
      {hasContributed && (
        <div className="mb-5 flex w-fit gap-1 rounded-[12px] border border-line bg-surface p-1">
          {(["created", "contributed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSource(s);
                setStatus("all");
                setQuery("");
              }}
              className={`inline-flex items-center gap-1.5 rounded-[9px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                source === s ? "bg-navy text-white" : "text-muted hover:text-ink"
              }`}
            >
              {s === "created" ? "Created" : "Contributed"}
              <span className={`tnum text-xs ${source === s ? "text-white/60" : "text-muted/70"}`}>
                {s === "created" ? created.length : contributed.length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-[12px] border border-line bg-surface p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === t.key ? "bg-brand text-navy" : "text-muted hover:text-ink"
              }`}
            >
              {t.key !== "all" && <span className={`h-2 w-2 rounded-full ${TAB_DOT[t.key]}`} />}
              {t.label}
              <span className={`tnum text-xs ${status === t.key ? "text-navy/60" : "text-muted/70"}`}>
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
            title={
              query
                ? "No pools match your search"
                : source === "contributed"
                  ? "No contributions here"
                  : "You haven't created any pools yet"
            }
            description={
              query
                ? "Try a different name."
                : source === "contributed"
                  ? "Pools you contribute to will show up here."
                  : "Create your first pool — it takes about a minute."
            }
            action={source === "created" ? <ButtonLink href="/pools/new">Create a pool</ButtonLink> : undefined}
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
