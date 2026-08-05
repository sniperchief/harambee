"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AmountInput } from "@/components/ui/Field";
import { CountUp } from "@/components/ui/CountUp";
import { contributeWithPasskey, refundWithPasskey } from "@/lib/poolContribute";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { useFxRate } from "@/lib/useFxRate";
import { txUrl, addressUrl } from "@/lib/explorer";
import { friendlyPasskeyError } from "@/lib/authErrors";
import {
  formatUsdc,
  formatLocal,
  progressPercent,
  statusMeta,
  timeUntil,
  timeAgo,
  shortAddress,
  type PoolStatus,
} from "@/lib/format";

type Pool = {
  id: string;
  title: string;
  description: string | null;
  target_amount: string | number;
  current_amount: string | number;
  deadline: string;
  status: PoolStatus;
  onchain_pool_id: string;
  target_currency: string | null;
  local_currency_amount: string | number | null;
  fx_rate: string | number | null;
  recipient_wallet_address?: string | null;
  release_tx_hash?: string | null;
  created_at?: string;
};

export type Contribution = {
  id: string;
  amount: string;
  created_at: string;
  tx_hash: string | null;
  contributor: string | null;
};

type PoolState = {
  currentAmount: string | number;
  status: PoolStatus;
  finalValue?: string;
  localCurrencyAmount?: string | number | null;
  targetCurrency?: string | null;
  fxRate?: string | number | null;
  txHash?: string;
};

const POLL_INTERVAL_MS = 4000;

// Never let an empty or non-JSON response crash the UI — a transient network
// blip on a background refresh must not surface as an error for an action
// (like a contribution) that already succeeded.
async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function LeafIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>;
}

export function PoolDetail({
  pool,
  poolEscrowAddress,
  isLoggedIn,
  viewerWalletAddress,
  contributions,
  contributorCount,
  viewerContributed,
  viewerClaimed,
}: {
  pool: Pool;
  poolEscrowAddress: `0x${string}`;
  isLoggedIn: boolean;
  viewerWalletAddress: string | null;
  contributions: Contribution[];
  contributorCount: number;
  viewerContributed: boolean;
  viewerClaimed: boolean;
}) {
  const [state, setState] = useState<PoolState>({
    currentAmount: pool.current_amount,
    status: pool.status,
    localCurrencyAmount: pool.local_currency_amount,
    targetCurrency: pool.target_currency,
    fxRate: pool.fx_rate,
  });
  const [amount, setAmount] = useState("");
  const [contributeStatus, setContributeStatus] = useState<"idle" | "working" | "error">("idle");
  const [refundStatus, setRefundStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [yieldEarned, setYieldEarned] = useState<string | null>(null);
  const { balance, refresh: refreshBalance } = useWalletBalance();
  const fxRate = useFxRate(pool.target_currency);

  const refreshYield = useCallback(async () => {
    try {
      const r = await fetch(`/api/pools/${pool.id}/yield`);
      if (r.ok) {
        const body = await r.json();
        setYieldEarned(body.yield ?? null);
      }
    } catch {
      // leave as-is
    }
  }, [pool.id]);

  useEffect(() => {
    refreshYield();
  }, [refreshYield]);

  // Tick once a second so expiry and the countdown update live — this is what
  // flips the contribute box to "Pool ended" the instant the clock runs out,
  // even while someone is mid-typing.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Catch the backend up on load: a past-deadline pool can still read "open"
  // in the DB until a sync releases/refunds it, so kick one immediately.
  useEffect(() => {
    fetch(`/api/pools/${pool.id}/sync`, { method: "POST" })
      .then(async (r) => {
        if (r.ok) {
          const body = await safeJson(r);
          if (body) setState((prev) => ({ ...prev, ...body }));
        }
      })
      .catch(() => {});
  }, [pool.id]);

  useEffect(() => {
    if (state.status !== "open") return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/pools/${pool.id}/sync`, { method: "POST" });
      if (response.ok) {
        const body = await safeJson(response);
        if (body) setState((prev) => ({ ...prev, ...body }));
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pool.id, state.status]);

  async function handleContribute() {
    setContributeStatus("working");
    setErrorMessage("");
    try {
      const { txHash } = await contributeWithPasskey(poolEscrowAddress, pool.onchain_pool_id, amount);
      const response = await fetch(`/api/pools/${pool.id}/contribute/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, txHash }),
      });
      const body = await safeJson(response);
      if (!response.ok) throw new Error((body?.error as string) ?? "Failed to record contribution");
      if (body) setState((prev) => ({ ...prev, ...body }));
      setAmount("");
      setContributeStatus("idle");
      refreshBalance();
      refreshYield();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Contribution failed";
      const closed = /not open|deadline|closed/i.test(msg);
      const { cancelled, message } = friendlyPasskeyError(err);
      if (cancelled) {
        // Cancelling the passkey prompt is normal — no error.
        setContributeStatus("idle");
      } else {
        setContributeStatus("error");
        setErrorMessage(
          closed ? "This pool just closed — contributions are no longer accepted." : message
        );
      }
      if (closed) {
        // Flip the UI to the pool's real state.
        fetch(`/api/pools/${pool.id}/sync`, { method: "POST" })
          .then(async (r) => {
            if (r.ok) {
              const body = await safeJson(r);
              if (body) setState((prev) => ({ ...prev, ...body }));
            }
          })
          .catch(() => {});
      }
    }
  }

  async function handleRefund() {
    setRefundStatus("working");
    setErrorMessage("");
    try {
      await refundWithPasskey(poolEscrowAddress, pool.onchain_pool_id);
      setRefundStatus("done");
    } catch (err) {
      setRefundStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Refund failed");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const target = Number(pool.target_amount);
  const current = Number(state.currentAmount);
  const pct = progressPercent(current, target);
  const status = statusMeta(state.status);
  const time = timeUntil(pool.deadline);

  // Live expiry gate. Contributions stop a 60s safety buffer BEFORE the
  // deadline (the machine clock can differ from chain time). We gate on the
  // deadline itself, not the DB status, because release is lazy — a
  // past-deadline pool can still read "open" until a sync catches up.
  const CLOSE_BUFFER_MS = 60_000;
  const statusOpen = state.status === "open";
  const contributionsClosed = now >= new Date(pool.deadline).getTime() - CLOSE_BUFFER_MS;
  const canContribute = statusOpen && !contributionsClosed; // genuinely open right now
  const endedByDeadline = statusOpen && contributionsClosed; // "open" in DB but past the (buffered) deadline
  const showLiveOpen = canContribute; // drives the "Open" badge + yield line
  const badgeLabel = endedByDeadline ? "Ended" : status.label;
  const badgeTone = endedByDeadline ? "muted" : status.tone;
  const insufficient = balance !== null && !!amount && Number(amount) > Number(balance);
  const yieldNum = yieldEarned !== null ? Number(yieldEarned) : 0;
  const showYieldAmt = yieldNum >= 0.00005;
  const releasedYield =
    state.status === "released" && state.finalValue
      ? Math.max(0, Number(state.finalValue) - Number(state.currentAmount))
      : 0;
  const refundClaimed = viewerClaimed || refundStatus === "done";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Badge tone={badgeTone} dot={showLiveOpen}>{badgeLabel}</Badge>
            {showLiveOpen && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <LeafIcon />
                {showYieldAmt
                  ? `Earning yield · +$${formatUsdc(yieldEarned!, { decimals: 4 })}`
                  : "Earning yield in escrow"}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-[34px]">{pool.title}</h1>
          {pool.description && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{pool.description}</p>}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Progress hero — first on mobile, top-left on desktop */}
        <div className="order-1 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Card className="p-6 sm:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted">Raised so far</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-navy sm:text-5xl">
                  <CountUp value={current} prefix="$" />
                </p>
                {pool.target_currency && fxRate !== null && (
                  <p className="mt-1 text-sm text-muted tnum">
                    ≈ {formatLocal(Number(current) * fxRate, pool.target_currency)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-ink tnum">{Math.round(pct)}%</p>
                <p className="text-sm text-muted tnum">of ${formatUsdc(target)}</p>
              </div>
            </div>
            <Progress value={pct} tone={state.status === "released" ? "success" : "brand"} size="lg" className="mt-5" />

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-[12px] bg-navy px-2 py-3.5 text-center">
                <p className="text-xs font-medium text-white/60">Contributors</p>
                <p className="mt-1 text-sm font-semibold text-white tnum">{contributorCount}</p>
              </div>
              <div className="rounded-[12px] border border-line bg-surface px-2 py-3.5 text-center">
                <p className="text-xs font-medium text-muted">Release</p>
                <p className={`mt-1 text-sm font-semibold tnum ${showLiveOpen && time.urgent ? "text-warning" : "text-ink"}`}>
                  {showLiveOpen ? time.label : endedByDeadline ? "Ended" : status.label}
                </p>
              </div>
              <div className="rounded-[12px] bg-brand-strong px-2 py-3.5 text-center">
                <p className="text-xs font-medium text-white/70">Target</p>
                <p className="mt-1 text-sm font-semibold text-white tnum">
                  {pool.target_currency && fxRate !== null
                    ? formatLocal(Number(target) * fxRate, pool.target_currency)
                    : `$${formatUsdc(target, { decimals: 0 })}`}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Released summary + funding history — below progress on desktop */}
        <div className="order-3 lg:order-none space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-2">
          {/* Released summary */}
          {state.status === "released" && (
            <Card className="border-success/30 bg-success-50/40 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </span>
                <div>
                  <p className="font-semibold text-ink">Funds released to the recipient</p>
                  <p className="text-sm text-muted tnum">
                    ${formatUsdc(state.finalValue ?? state.currentAmount)} USDC
                    {state.localCurrencyAmount ? ` · ≈ ${formatLocal(state.localCurrencyAmount, state.targetCurrency)} (rate ${state.fxRate}, informational)` : ""}
                  </p>
                  {releasedYield > 0 && (
                    <p className="mt-0.5 text-xs font-medium text-success tnum">
                      includes +${formatUsdc(releasedYield, { decimals: 4 })} yield earned
                    </p>
                  )}
                  {(state.txHash ?? pool.release_tx_hash) && (
                    <a
                      href={txUrl((state.txHash ?? pool.release_tx_hash)!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-success hover:underline"
                    >
                      View release on-chain ↗
                    </a>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Funding history */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">Funding history</h2>
            {contributions.length === 0 ? (
              <p className="mt-4 rounded-[12px] bg-surface-2 px-4 py-8 text-center text-sm text-muted">
                No contributions yet. Be the first to chip in.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {contributions.map((c) => {
                  const name = c.contributor ?? "Someone";
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <Avatar name={name} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink tnum">{c.contributor ? shortAddress(c.contributor) : "Anonymous"}</p>
                        <p className="text-xs text-muted">
                          {timeAgo(c.created_at)}
                          {c.tx_hash && (
                            <>
                              {" · "}
                              <a
                                href={txUrl(c.tx_hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-brand-600 hover:underline"
                              >
                                on-chain ↗
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-ink tnum">+${formatUsdc(c.amount)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            <a
              href={addressUrl(poolEscrowAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-brand-600"
            >
              Held in escrow contract {shortAddress(poolEscrowAddress)} ↗
            </a>
          </Card>
        </div>

        {/* Action card — under "Raised so far" on mobile; sticky right column on desktop */}
        <div className="order-2 lg:order-none lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2">
          <div className="lg:sticky lg:top-24">
            <Card className="p-6 shadow-sm">
              {canContribute && (
                <>
                  <h2 className="text-lg font-semibold text-ink">Contribute</h2>
                  <p className="mt-1 text-sm text-muted">Chip in any amount. It settles in seconds, no gas fee.</p>
                  {isLoggedIn ? (
                    <div className="mt-5 flex flex-col gap-3">
                      <AmountInput
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                      <div className="flex flex-wrap gap-2">
                        {[10, 25, 50, 100].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAmount(String(v))}
                            className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
                          >
                            ${v}
                          </button>
                        ))}
                      </div>
                      {insufficient ? (
                        <a
                          href="https://faucet.circle.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-13 min-h-[52px] w-full items-center justify-center rounded-none bg-brand-strong px-5 text-[15px] font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:brightness-95 hover:shadow-lg"
                        >
                          Add funds
                        </a>
                      ) : (
                        <Button onClick={handleContribute} size="lg" disabled={!amount || Number(amount) <= 0 || contributeStatus === "working"}>
                          {contributeStatus === "working" ? "Confirming…" : "Contribute with passkey"}
                        </Button>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="tnum">
                          Balance: {balance !== null ? `$${formatUsdc(balance)}` : "—"}
                        </span>
                        {viewerWalletAddress && <span className="tnum">{shortAddress(viewerWalletAddress)}</span>}
                      </div>
                      {insufficient && (
                        <p className="text-xs text-warning">
                          That&apos;s more than your balance — add funds to contribute this amount.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5">
                      <Link
                        href={`/register?next=/pools/${pool.id}`}
                        className="inline-flex h-11 w-full items-center justify-center rounded-none bg-navy px-5 text-[15px] font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-[#12365f] hover:shadow-lg"
                      >
                        Sign in to contribute
                      </Link>
                      <p className="mt-3 text-center text-xs text-muted">
                        Takes a few seconds with a passkey. Already have one?{" "}
                        <Link href={`/login?next=/pools/${pool.id}`} className="font-semibold text-brand hover:underline">Log in</Link>
                      </p>
                    </div>
                  )}
                </>
              )}

              {endedByDeadline && (
                <div className="text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  </span>
                  <p className="mt-3 font-semibold text-ink">Pool ended</p>
                  <p className="mt-1 text-sm text-muted">
                    Contributions are closed. If the goal was met, funds release to the recipient; otherwise contributors can claim a refund shortly.
                  </p>
                  <Button size="lg" className="mt-5 w-full" disabled>
                    Pool ended
                  </Button>
                </div>
              )}

              {state.status === "refunded" &&
                (viewerContributed ? (
                  <>
                    <h2 className="text-lg font-semibold text-ink">Claim your refund</h2>
                    <p className="mt-1 text-sm text-muted">
                      This pool didn&apos;t reach its goal in time. Your contribution is available to withdraw.
                    </p>
                    {isLoggedIn ? (
                      <Button
                        onClick={handleRefund}
                        size="lg"
                        className="mt-5 w-full"
                        disabled={refundClaimed || refundStatus === "working"}
                      >
                        {refundClaimed ? "Refund claimed" : refundStatus === "working" ? "Claiming…" : "Claim refund"}
                      </Button>
                    ) : (
                      <Link href={`/login?next=/pools/${pool.id}`} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-none bg-navy px-5 text-[15px] font-semibold text-white shadow-md hover:shadow-lg">
                        Sign in to claim
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </span>
                    <p className="mt-3 font-semibold text-ink">Pool refunded</p>
                    <p className="mt-1 text-sm text-muted">
                      This pool didn&apos;t reach its goal, so contributions were returned to everyone who gave.
                    </p>
                  </div>
                ))}

              {state.status === "released" && (
                <div className="text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                  <p className="mt-3 font-semibold text-ink">Goal reached</p>
                  <p className="mt-1 text-sm text-muted">This pool is complete and funds have been released.</p>
                </div>
              )}

              {state.status === "cancelled" && (
                <div className="text-center">
                  <p className="font-semibold text-ink">Pool cancelled</p>
                  <p className="mt-1 text-sm text-muted">This pool is no longer accepting contributions.</p>
                </div>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-[10px] bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger">{errorMessage}</p>
              )}

              <Button variant="secondary" onClick={copyLink} className="mt-4 w-full">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v14"/></svg>
                {copied ? "Link copied" : "Share pool"}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 border-t border-line pt-4 text-xs text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
                Funds secured in on-chain escrow
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

