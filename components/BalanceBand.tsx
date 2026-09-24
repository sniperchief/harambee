"use client";

import { useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { formatUsdc } from "@/lib/format";
import { PillButton, PillLink } from "@/components/design/PillButton";

// The dashboard's money surface: an ink panel with the available balance as a
// large DM Mono figure, and reversed outlined pills to fund or copy the wallet.
export function BalanceBand({ address }: { address: string | null }) {
  const { balance, loading } = useWalletBalance();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-8 rounded-[20px] bg-ink-black p-6 text-bone-white sm:p-9 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="text-body text-bone-white/80">Available balance</p>
        <div className="mt-3 flex min-h-[48px] items-center sm:min-h-[84px]">
          {loading ? (
            <span className="inline-block h-14 w-60 animate-[breathe_1.6s_ease-in-out_infinite] rounded-2xl bg-bone-white/15" />
          ) : (
            <p className="font-dm-mono text-[clamp(34px,10.5vw,80px)] font-medium leading-none tracking-[-0.02em] tnum [overflow-wrap:anywhere]">
              {balance !== null ? `$${formatUsdc(balance)}` : "—"}
            </p>
          )}
        </div>
        <p className="mt-3 font-dm-mono text-sm text-bone-white/80">USDC on Arc · gasless</p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        {/* Funding is a plain USDC transfer to the wallet address, which Settings explains. */}
        <PillLink href="/settings" variant="outlined-light" compact>
          Add funds
        </PillLink>
        <PillButton
          variant="outlined-light"
          compact
          disabled={!address}
          onClick={async () => {
            if (!address) return;
            try {
              await navigator.clipboard.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
        >
          {copied ? "Copied" : "Copy address"}
        </PillButton>
      </div>
    </div>
  );
}
