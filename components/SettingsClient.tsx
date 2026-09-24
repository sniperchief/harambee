"use client";

import { useState } from "react";
import { shortAddress, formatUsdc } from "@/lib/format";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { PillButton } from "@/components/design/PillButton";
import { StatCallout } from "@/components/design/StatCallout";
import { WarmCard } from "@/components/design/Card";

// Pill-shaped switch: ink when on, Oat when off.
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-ink-black" : "bg-oat"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-bone-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export function WalletCard({ address }: { address: string | null }) {
  const [copied, setCopied] = useState(false);
  const { balance, loading } = useWalletBalance();
  return (
    <div className="flex flex-col gap-8">
      {loading ? (
        <div>
          <div className="skeleton h-[54px] w-48 rounded-2xl" />
          <div className="skeleton mt-3 h-5 w-32 rounded-full" />
        </div>
      ) : (
        <StatCallout value={balance !== null ? `$${formatUsdc(balance)}` : "—"} label="Available balance · USDC" />
      )}

      <div className="flex flex-col gap-4 border-t border-oat pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-body font-medium">Smart wallet address</p>
          <p className="mt-1 truncate font-dm-mono text-sm text-char">{address ?? "—"}</p>
        </div>
        <PillButton
          variant="outlined"
          compact
          className="shrink-0"
          onClick={async () => {
            if (!address) return;
            try {
              await navigator.clipboard.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
        >
          {copied ? "Copied" : `Copy ${address ? shortAddress(address) : ""}`}
        </PillButton>
      </div>

      <WarmCard className="!p-5 text-sm">
        To add funds, send USDC on the Arc network to this address. Sending other tokens, or USDC on
        another network, won&apos;t arrive.
      </WarmCard>
    </div>
  );
}

export function NotificationToggles() {
  const [prefs, setPrefs] = useState({
    contributions: true,
    releases: true,
    deadlines: true,
    product: false,
  });
  const rows: { key: keyof typeof prefs; title: string; body: string }[] = [
    { key: "contributions", title: "New contributions", body: "When someone chips into a pool you're part of." },
    { key: "releases", title: "Releases & refunds", body: "When a pool reaches its goal or becomes refundable." },
    { key: "deadlines", title: "Deadline reminders", body: "A nudge as a pool's deadline approaches." },
    { key: "product", title: "Product updates", body: "Occasional news about new Harambee features." },
  ];
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.key} className="ledger-row flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
          <div>
            <p className="text-body font-medium">{r.title}</p>
            <p className="mt-0.5 text-body text-char">{r.body}</p>
          </div>
          <Toggle label={r.title} on={prefs[r.key]} onClick={() => setPrefs((p) => ({ ...p, [r.key]: !p[r.key] }))} />
        </li>
      ))}
    </ul>
  );
}
