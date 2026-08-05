"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Textarea, Select, AmountInput } from "@/components/ui/Field";
import { formatUsdc, formatLocal, formatDateTime } from "@/lib/format";
import { useFxRate } from "@/lib/useFxRate";

const CURRENCIES = ["NGN", "KES", "GHS", "USD", "GBP", "EUR", "ZAR"];

// Relative durations sidestep timezone confusion entirely — the deadline is
// computed as "now + duration" at submit time, independent of the machine's
// timezone. "Custom" falls back to an absolute date/time picker.
const DURATIONS = [
  { key: "12h", label: "12 hours", ms: 12 * 3_600_000 },
  { key: "1d", label: "1 day", ms: 86_400_000 },
  { key: "3d", label: "3 days", ms: 3 * 86_400_000 },
  { key: "1w", label: "1 week", ms: 7 * 86_400_000 },
  { key: "2w", label: "2 weeks", ms: 14 * 86_400_000 },
  { key: "custom", label: "Custom", ms: 0 },
] as const;

const RELEASE_MODES = [
  {
    key: "threshold_or_deadline",
    title: "Target or deadline",
    body: "Release as soon as the target is hit — or at the deadline, whatever comes first.",
  },
  {
    key: "threshold_only",
    title: "Only when target is reached",
    body: "Funds release the moment the goal is met. If the deadline passes first, contributors are refunded.",
  },
  {
    key: "deadline_only",
    title: "Only at the deadline",
    body: "Collect right up to the deadline, then release whatever has been raised.",
  },
] as const;

type Mode = (typeof RELEASE_MODES)[number]["key"];

const STEPS = ["Goal", "Details", "Review"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  state === "done"
                    ? "bg-success text-white"
                    : state === "current"
                      ? "bg-navy text-white"
                      : "bg-surface-2 text-muted"
                }`}
              >
                {state === "done" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={`hidden text-sm font-medium sm:block ${state === "todo" ? "text-muted" : "text-ink"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${i < step ? "bg-success" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function CreatePoolForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("");
  const [recipientWalletAddress, setRecipientWalletAddress] = useState("");
  const [durationKey, setDurationKey] = useState<string>("1w");
  const [customDeadline, setCustomDeadline] = useState("");
  const [releaseMode, setReleaseMode] = useState<Mode>("threshold_or_deadline");
  const [status, setStatus] = useState<"idle" | "working" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fxRate = useFxRate(targetCurrency);

  function computeDeadlineIso() {
    if (durationKey === "custom") return customDeadline ? new Date(customDeadline).toISOString() : "";
    const d = DURATIONS.find((x) => x.key === durationKey);
    return d ? new Date(Date.now() + d.ms).toISOString() : "";
  }

  const step1Valid = title.trim().length > 0 && Number(targetAmount) > 0;
  const step2Valid =
    durationKey !== "custom" || (!!customDeadline && new Date(customDeadline).getTime() > Date.now());

  async function handleSubmit() {
    setStatus("working");
    setErrorMessage("");
    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          targetAmount,
          deadline: computeDeadlineIso(),
          recipientWalletAddress: recipientWalletAddress || undefined,
          targetCurrency: targetCurrency || undefined,
          releaseMode,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create pool");
      setCreatedId(body.pool.id);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create pool");
    }
  }

  // ---- Success ----
  if (status === "done" && createdId) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/pools/${createdId}` : "";
    const deadlineIso = computeDeadlineIso();
    return (
      <div className="animate-scale-in text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success ring-8 ring-success-50/50">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-navy">Your pool is live</h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
          Share it to start collecting. Funds are held safely in escrow and begin earning yield right away.
        </p>

        {/* Preview of the pool just created */}
        <div className="mt-6 rounded-[16px] border border-line bg-surface-2/50 p-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-semibold text-navy">{title}</p>
            <Badge tone="brand" dot>Open</Badge>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Target</dt>
              <dd className="font-semibold text-ink tnum">
                ${formatUsdc(targetAmount)}
                {targetCurrency && fxRate !== null
                  ? ` · ≈ ${formatLocal(Number(targetAmount) * fxRate, targetCurrency)}`
                  : ""}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Closes</dt>
              <dd className="font-medium text-ink">{deadlineIso ? formatDateTime(deadlineIso) : "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Share — QR + link */}
        <div className="mt-4 flex flex-col items-center gap-3.5 rounded-[16px] border border-line p-5">
          {link && (
            <div className="rounded-[12px] border border-line bg-white p-3">
              <QRCodeSVG value={link} size={124} fgColor="#0f2747" bgColor="#ffffff" level="M" />
            </div>
          )}
          <p className="text-xs text-muted">Scan to open the pool — handy for sharing in person.</p>
          <div className="flex w-full items-center gap-2 rounded-[12px] border border-line bg-surface-2 p-1.5 pl-3.5">
            <span className="flex-1 truncate text-left text-sm text-muted tnum">{link}</span>
            <CopyButton text={link} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => router.push(`/pools/${createdId}`)} variant="coral" size="lg" className="flex-1">
            View pool
          </Button>
          <Button onClick={() => router.push("/dashboard")} variant="secondary" size="lg" className="flex-1">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* right padding keeps the last step clear of the card's corner close (X) */}
      <div className="pr-9">
        <Stepper step={step} />
      </div>

      <div className="mt-8 min-h-[344px]">
        {/* Step 1 — Goal */}
        {step === 0 && (
          <div className="animate-fade-in-still flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy">What are you raising for?</h2>
              <p className="mt-1 text-sm text-muted">Give your pool a clear name and a target.</p>
            </div>
            <Field label="Pool name" htmlFor="title">
              <Input id="title" placeholder="e.g. Amara & Kofi's Wedding Fund" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>
            <Field label="Description" htmlFor="desc" hint="Optional — a sentence on what the money is for.">
              <Textarea id="desc" placeholder="Helping the couple celebrate with everyone they love." value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Target amount" hint="The goal you're collecting toward, in USDC.">
              <AmountInput value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" />
            </Field>
            <Field label="Show a familiar currency" htmlFor="cur" hint="Contributors will see an approximate local value alongside USDC.">
              <Select id="cur" value={targetCurrency} onChange={(e) => setTargetCurrency(e.target.value)}>
                <option value="">None</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 1 && (
          <div className="animate-fade-in-still flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy">Where and when</h2>
              <p className="mt-1 text-sm text-muted">Choose who receives the funds and how they&apos;re released.</p>
            </div>
            <Field label="Recipient" htmlFor="recipient" hint="Leave blank to send the funds to your own wallet.">
              <Input id="recipient" placeholder="Recipient wallet address (optional)" value={recipientWalletAddress} onChange={(e) => setRecipientWalletAddress(e.target.value)} className="tnum" />
            </Field>
            <div>
              <p className="text-sm font-medium text-ink">How long should it stay open?</p>
              <p className="mt-0.5 text-xs text-muted">Contributions close after this. Uses your local time — no timezone guessing.</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => {
                  const active = durationKey === d.key;
                  return (
                    <button
                      type="button"
                      key={d.key}
                      onClick={() => setDurationKey(d.key)}
                      className={`rounded-[12px] border px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "border-brand bg-brand-50 text-brand-600"
                          : "border-line bg-surface text-ink hover:border-line-strong"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {durationKey === "custom" ? (
                <Input
                  type="datetime-local"
                  value={customDeadline}
                  onChange={(e) => setCustomDeadline(e.target.value)}
                  className="mt-2.5"
                />
              ) : (
                <p className="mt-2.5 text-sm text-muted">
                  Closes <span className="font-medium text-ink">{formatDateTime(computeDeadlineIso())}</span>
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Release condition</p>
              <div className="mt-2 flex flex-col gap-2.5">
                {RELEASE_MODES.map((m) => {
                  const active = releaseMode === m.key;
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setReleaseMode(m.key)}
                      className={`flex items-start gap-3 rounded-[14px] border p-4 text-left transition-all ${
                        active ? "border-brand bg-brand-50/50 ring-4 ring-brand/10" : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-brand" : "border-line-strong"}`}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold text-ink">{m.title}</span>
                        <span className="mt-0.5 block text-sm text-muted">{m.body}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 2 && (
          <div className="animate-fade-in-still">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy">Review your pool</h2>
              <p className="mt-1 text-sm text-muted">Check the details before it goes live.</p>
            </div>
            <dl className="mt-5 divide-y divide-line rounded-[16px] border border-line bg-surface">
              {[
                ["Name", title],
                ["Description", description || "—"],
                ["Target", `$${formatUsdc(targetAmount)} USDC${targetCurrency && fxRate !== null ? ` · ≈ ${formatLocal(Number(targetAmount) * fxRate, targetCurrency)}` : ""}`],
                ["Recipient", recipientWalletAddress || "Your own wallet"],
                ["Deadline", computeDeadlineIso() ? formatDateTime(computeDeadlineIso()) : "—"],
                ["Release", RELEASE_MODES.find((m) => m.key === releaseMode)?.title ?? ""],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 px-4 py-3.5">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="max-w-[60%] break-words text-right text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-[12px] bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
              Creating a pool deploys it to escrow on-chain. This takes a few seconds and no gas fee for you.
            </p>
            {status === "error" && (
              <p className="mt-3 rounded-[10px] bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger">{errorMessage}</p>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {step === 0 ? (
          <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">Cancel</Link>
        ) : (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={status === "working"}>Back</Button>
        )}

        {step < 2 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !step1Valid) || (step === 1 && !step2Valid)}
            size="lg"
          >
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={status === "working"} size="lg">
            {status === "working" ? "Creating pool…" : "Create pool"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
