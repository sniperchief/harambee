"use client";

import { useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { formatUsdc } from "@/lib/format";
import { PillButton } from "@/components/design/PillButton";

// The dashboard's money surface: an ink panel with the available balance as a
// large DM Mono figure. "Add funds" copies the wallet address — funding is a
// plain USDC transfer to it — and says, right when it matters, which network
// to send on (sending on another network or another token won't arrive).
export function BalanceBand({ address }: { address: string | null }) {
  const { balance, loading } = useWalletBalance();
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  async function addFunds() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopy("copied");
    } catch {
      // Clipboard blocked (permissions / insecure context): show the address
      // so it can be copied by hand.
      setCopy("failed");
    }
  }

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
      </div>

      <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
        <PillButton variant="outlined-light" compact onClick={addFunds} disabled={!address}>
          {copy === "copied" ? "Address copied" : "Add funds"}
        </PillButton>
        <p aria-live="polite" className="max-w-[300px] text-sm text-bone-white/80 md:text-right">
          {copy === "copied" && "Address copied — send USDC on the Arc network to it."}
          {copy === "failed" && address && (
            <>
              Send USDC on the Arc network to{" "}
              <span className="select-all break-all font-dm-mono text-bone-white">{address}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
