"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shortAddress, formatUsdc } from "@/lib/format";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { PillButton } from "@/components/design/PillButton";
import { StatCallout } from "@/components/design/StatCallout";
import { WarmCard } from "@/components/design/Card";
import { FieldShell, InputField } from "@/components/design/InputField";
import { usernameProblem } from "@/lib/username";

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

/** Set or change the username shown in the greeting and account chip. */
export function UsernameForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const unchanged = trimmed === (current ?? "");
  // Live character check; the length rule waits until they try to save.
  const charProblem = trimmed && /[^A-Za-z0-9_@.:+-]/.test(trimmed) ? usernameProblem(trimmed) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = usernameProblem(trimmed);
    if (problem) {
      setError(problem);
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const r = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Couldn't save your username. Please try again.");
      setStatus("saved");
      router.refresh(); // greeting + account chip pick up the new name
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Couldn't save your username. Please try again.");
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <FieldShell
        label="Username"
        htmlFor="username"
        hint={current ? "5–15 characters. Shown in your greeting." : "You haven't picked one yet — 5–15 characters."}
        error={error ?? charProblem ?? undefined}
      >
        <InputField
          id="username"
          value={value}
          placeholder="e.g. amara_o"
          maxLength={15}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!(error || charProblem)}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
            setStatus("idle");
          }}
        />
      </FieldShell>
      <div className="flex items-center gap-4">
        <PillButton type="submit" variant="black" compact disabled={unchanged || status === "saving" || !!charProblem}>
          {status === "saving" ? "Saving…" : "Save username"}
        </PillButton>
        {status === "saved" && (
          <span role="status" className="text-sm">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
