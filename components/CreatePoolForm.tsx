"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PillButton } from "@/components/design/PillButton";
import { SurfaceCard } from "@/components/design/Card";
import { Tag, TagButton } from "@/components/design/Tag";
import { FieldShell, InputField, TextAreaField, SelectField, FormMessage } from "@/components/design/InputField";
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

const STEPS = ["Goal", "Terms", "Review"];

// "NEW POOL · STEP 1 OF 3" + Cancel, over three segment bars with labels.
function StepHeader({ step, done }: { step: number; done: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="type-eyebrow">{done ? "New pool · Live" : `New pool · Step ${step + 1} of ${STEPS.length}`}</p>
        {!done && (
          <Link href="/dashboard" className="border-b-[1.5px] border-ink-black pb-0.5 text-body no-underline">
            Cancel
          </Link>
        )}
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const reached = done || i <= step;
          return (
            <li key={label} aria-current={!done && i === step ? "step" : undefined}>
              <span className={`block h-1.5 rounded-full ${reached ? "bg-ink-black" : "bg-[#f0e6c2]"}`} />
              <span className={`mt-2 block text-sm ${reached ? "text-ink-black" : "text-char"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const CARD_TITLE = "font-champ text-[36px] font-extrabold leading-[1.08] tracking-[0.01em] sm:text-[46px]";

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

  // A render-safe clock for the "Closes …" preview and custom-date validation,
  // refreshed every 30s. The deadline actually submitted is stamped from the
  // real clock at submit time (see handleSubmit).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  function computeDeadlineIso(at: number = now) {
    if (durationKey === "custom") return customDeadline ? new Date(customDeadline).toISOString() : "";
    const d = DURATIONS.find((x) => x.key === durationKey);
    return d ? new Date(at + d.ms).toISOString() : "";
  }

  const step1Valid = title.trim().length > 0 && Number(targetAmount) > 0;
  const step2Valid =
    durationKey !== "custom" || (!!customDeadline && new Date(customDeadline).getTime() > now);

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
          deadline: computeDeadlineIso(Date.now()),
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
      <div className="animate-fade-in-still">
        <StepHeader step={STEPS.length - 1} done />
        <SurfaceCard className="mt-8 sm:!p-10">
          <Tag tone="black" small>Live</Tag>
          <h2 className={`${CARD_TITLE} mt-5`}>Your pool is live</h2>
          <p className="mt-3 text-body text-char">
            Share it to start collecting. Every contribution is held safely in escrow until the pool&apos;s rules are met.
          </p>

          <dl className="mt-8 border-t border-ink-black">
            {[
              ["Pool", title],
              [
                "Target",
                `$${formatUsdc(targetAmount)} USDC${
                  targetCurrency && fxRate !== null ? ` · ≈ ${formatLocal(Number(targetAmount) * fxRate, targetCurrency)}` : ""
                }`,
              ],
              ["Closes", deadlineIso ? formatDateTime(deadlineIso) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 border-b border-dashed border-oat py-4">
                <dt className="text-char">{k}</dt>
                <dd className="max-w-[65%] break-words text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            {link && (
              <div className="shrink-0 rounded-2xl border-[1.5px] border-ink-black bg-bone-white p-3">
                <QRCodeSVG value={link} size={112} fgColor="#000000" bgColor="#ffffff" level="M" />
              </div>
            )}
            <div className="w-full min-w-0">
              <p className="text-sm text-char">Share the link, or let people scan the code in person.</p>
              <div className="mt-3 flex items-center gap-2">
                <InputField readOnly value={link} aria-label="Pool link" className="min-w-0 font-dm-mono text-sm" />
                <CopyButton text={link} />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <PillButton onClick={() => router.push("/dashboard")} variant="outlined">
            Back to dashboard
          </PillButton>
          <PillButton onClick={() => router.push(`/pools/${createdId}`)} className="!border-ink-black">
            View pool
          </PillButton>
        </div>
      </div>
    );
  }

  const localPreview =
    targetCurrency && fxRate !== null && Number(targetAmount) > 0
      ? formatLocal(Number(targetAmount) * fxRate, targetCurrency)
      : null;

  return (
    <div>
      <StepHeader step={step} done={false} />

      <SurfaceCard className="mt-8 sm:!p-10">
        {/* Step 1 — Goal */}
        {step === 0 && (
          <div className="animate-fade-in-still flex flex-col gap-6">
            <h2 className={CARD_TITLE}>What are you raising for?</h2>
            <FieldShell label="Pool name" htmlFor="title">
              <InputField id="title" placeholder="e.g. Amara & Kofi's Wedding Fund" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </FieldShell>
            <FieldShell label="Description" htmlFor="desc" hint="Optional — one sentence on what the money is for.">
              <TextAreaField id="desc" placeholder="Helping the couple celebrate with everyone they love." value={description} onChange={(e) => setDescription(e.target.value)} />
            </FieldShell>
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
              <FieldShell label="Target (USDC)" htmlFor="target">
                <InputField
                  id="target"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="font-dm-mono"
                />
              </FieldShell>
              <FieldShell label="Show a familiar currency" htmlFor="cur">
                <SelectField id="cur" value={targetCurrency} onChange={(e) => setTargetCurrency(e.target.value)}>
                  <option value="">None</option>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SelectField>
              </FieldShell>
            </div>
            {localPreview && (
              <p className="-mt-2 font-dm-mono text-sm text-char">Contributors will see ≈ {localPreview}</p>
            )}
          </div>
        )}

        {/* Step 2 — Terms */}
        {step === 1 && (
          <div className="animate-fade-in-still flex flex-col gap-8">
            <h2 className={CARD_TITLE}>Where and when?</h2>
            <FieldShell label="Recipient" htmlFor="recipient" hint="Leave blank to send the funds to your own wallet.">
              <InputField id="recipient" placeholder="Recipient wallet address (optional)" value={recipientWalletAddress} onChange={(e) => setRecipientWalletAddress(e.target.value)} className="font-dm-mono" />
            </FieldShell>

            <fieldset>
              <legend className="text-[15px] font-medium">How long should it stay open?</legend>
              <p className="text-sm text-char">Contributions close after this. Uses your local time.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <TagButton key={d.key} selected={durationKey === d.key} onClick={() => setDurationKey(d.key)}>
                    {d.label}
                  </TagButton>
                ))}
              </div>
              {durationKey === "custom" ? (
                <InputField
                  type="datetime-local"
                  aria-label="Custom deadline"
                  value={customDeadline}
                  onChange={(e) => setCustomDeadline(e.target.value)}
                  className="mt-4"
                />
              ) : (
                <p className="mt-4 text-sm text-char">
                  Closes <span className="font-dm-mono text-ink-black">{formatDateTime(computeDeadlineIso())}</span>
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-[15px] font-medium">Release condition</legend>
              <div className="mt-3 flex flex-col gap-3">
                {RELEASE_MODES.map((m) => {
                  const active = releaseMode === m.key;
                  return (
                    <button
                      type="button"
                      key={m.key}
                      aria-pressed={active}
                      onClick={() => setReleaseMode(m.key)}
                      className={`rounded-2xl border-[1.5px] p-5 text-left transition-colors ${
                        active ? "border-ink-black bg-buttercream" : "border-oat bg-bone-white hover:border-ink-black"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-body font-medium">{m.title}</span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${active ? "border-ink-black" : "border-oat"}`}
                          aria-hidden
                        >
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-ink-black" />}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-char">{m.body}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 2 && (
          <div className="animate-fade-in-still">
            <h2 className={CARD_TITLE}>Review your pool</h2>
            <p className="mt-3 text-body text-char">Check the details before it goes live.</p>
            <dl className="mt-8 border-t border-ink-black">
              {[
                ["Name", title],
                ["Description", description || "—"],
                ["Target", `$${formatUsdc(targetAmount)} USDC${localPreview ? ` · ≈ ${localPreview}` : ""}`],
                ["Recipient", recipientWalletAddress || "Your own wallet"],
                ["Deadline", computeDeadlineIso() ? formatDateTime(computeDeadlineIso()) : "—"],
                ["Release", RELEASE_MODES.find((m) => m.key === releaseMode)?.title ?? ""],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 border-b border-dashed border-oat py-4">
                  <dt className="text-char">{k}</dt>
                  <dd className="max-w-[65%] break-words text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-char">
              Creating a pool deploys it to escrow on-chain. This takes a few seconds and no gas fee for you.
            </p>
            {status === "error" && <FormMessage className="mt-5">{errorMessage}</FormMessage>}
          </div>
        )}
      </SurfaceCard>

      {/* Footer — outlined Back on the left, Marigold forward on the right */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <PillButton variant="outlined" onClick={() => setStep((s) => s - 1)} disabled={status === "working"}>
            Back
          </PillButton>
        ) : (
          <span />
        )}

        {step < 2 ? (
          <PillButton
            className="!border-ink-black"
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !step1Valid) || (step === 1 && !step2Valid)}
          >
            Continue
          </PillButton>
        ) : (
          <PillButton className="!border-ink-black" onClick={handleSubmit} disabled={status === "working"}>
            {status === "working" ? "Creating pool…" : "Create pool"}
          </PillButton>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <PillButton
      variant="black"
      compact
      className="shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </PillButton>
  );
}
