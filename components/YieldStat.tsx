"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/Stat";
import { formatUsdc } from "@/lib/format";

function LeafIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

// The "Earning yield" dashboard stat, now with a live total accrued across the
// user's open pools. Loads instantly (shows "On"/"—") and fills in the figure.
export function YieldStat({ activeCount }: { activeCount: number }) {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet/yield")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body) setTotal(Number(body.yield ?? 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value =
    total !== null && total > 0
      ? `$${formatUsdc(total, { decimals: total < 1 ? 4 : 2 })}`
      : activeCount > 0
        ? "On"
        : "—";

  return (
    <StatCard
      label="Earning yield"
      value={value}
      sub="5% APY on idle funds in escrow"
      icon={<LeafIcon />}
      tone="success"
      size="lg"
    />
  );
}
