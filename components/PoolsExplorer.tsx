"use client";

import { useMemo, useState } from "react";
import { PoolTable, type PoolSummary } from "@/components/PoolTable";
import { TagButton } from "@/components/design/Tag";
import { WarmCard } from "@/components/design/Card";
import { PillLink } from "@/components/design/PillButton";

type StatusTab = "all" | "open" | "released" | "refunded";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "released", label: "Released" },
  { key: "refunded", label: "Refunded" },
];

export function PoolsExplorer({ pools }: { pools: PoolSummary[] }) {
  const [status, setStatus] = useState<StatusTab>("all");

  const filtered = useMemo(
    () => (status === "all" ? pools : pools.filter((p) => p.status === status)),
    [pools, status]
  );

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h1 className="type-display">All pools</h1>
        <div className="flex flex-wrap gap-2 md:pb-2">
          {STATUS_TABS.map((t) => (
            <TagButton key={t.key} selected={status === t.key} onClick={() => setStatus(t.key)}>
              {t.label}
            </TagButton>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {filtered.length === 0 ? (
          <WarmCard className="flex flex-col items-center py-20 text-center">
            <h2 className="type-heading-sm">
              {pools.length === 0 ? "No pools yet" : `No ${status} pools`}
            </h2>
            <p className="mt-3 max-w-sm text-body text-char">
              {pools.length === 0
                ? "Pools you create or contribute to will show up here."
                : "Try another filter."}
            </p>
            {pools.length === 0 && (
              <PillLink href="/pools/new" className="mt-8">
                + Create a pool
              </PillLink>
            )}
          </WarmCard>
        ) : (
          <PoolTable pools={filtered} />
        )}
      </div>
    </div>
  );
}
