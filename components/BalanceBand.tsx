"use client";

import Link from "next/link";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { formatUsdc } from "@/lib/format";

// Full-width "account balance" hero for the dashboard. Navy so it reads as the
// primary money surface; loads instantly with a skeleton, fills in when ready.
export function BalanceBand() {
  const { balance, loading } = useWalletBalance();

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-[18px] bg-navy p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-white/60">Available balance</p>
        <div className="mt-1.5 h-9">
          {loading ? (
            <span className="inline-block h-8 w-32 animate-pulse rounded-md bg-white/10" />
          ) : (
            <p className="text-[32px] font-bold leading-none tracking-tight text-white tnum">
              {balance !== null ? `$${formatUsdc(balance)}` : "—"}
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-white/50">USDC · ready to contribute</p>
      </div>
      {/* Funding is a plain USDC transfer to the user's wallet address, which Settings shows. */}
      <Link
        href="/settings"
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-none bg-brand-strong px-5 text-[15px] font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:brightness-95 hover:shadow-lg"
      >
        Add funds
      </Link>
    </div>
  );
}
