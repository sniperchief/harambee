"use client";

import { useState } from "react";
import { shortAddress, formatUsdc } from "@/lib/format";
import { useWalletBalance } from "@/lib/useWalletBalance";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-[#d5d9e0]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function WalletCard({ address }: { address: string | null }) {
  const [copied, setCopied] = useState(false);
  const { balance, loading } = useWalletBalance();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-muted">Available balance</p>
        <div className="mt-1 h-8">
          {loading ? (
            <span className="inline-block h-7 w-28 animate-pulse rounded-md bg-surface-2" />
          ) : (
            <p className="text-2xl font-bold leading-none tracking-tight text-navy tnum">
              {balance !== null ? `$${formatUsdc(balance)}` : "—"}
            </p>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">Testnet USDC</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">Smart wallet address</p>
        <p className="mt-0.5 truncate text-sm text-muted tnum">{address ?? "—"}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={async () => {
            if (!address) return;
            try {
              await navigator.clipboard.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
          className="inline-flex h-9 items-center rounded-[10px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-line-strong hover:bg-surface-2"
        >
          {copied ? "Copied" : `Copy ${address ? shortAddress(address) : ""}`}
        </button>
        <a
          href="https://faucet.circle.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-[10px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-line-strong hover:bg-surface-2"
        >
          Add test funds
        </a>
      </div>
      </div>
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
    <div className="divide-y divide-line">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-medium text-ink">{r.title}</p>
            <p className="mt-0.5 text-sm text-muted">{r.body}</p>
          </div>
          <Toggle on={prefs[r.key]} onClick={() => setPrefs((p) => ({ ...p, [r.key]: !p[r.key] }))} />
        </div>
      ))}
    </div>
  );
}
