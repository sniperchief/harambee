"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PillButton, PillLink } from "@/components/design/PillButton";
import { SurfaceCard, WarmCard } from "@/components/design/Card";
import { Tag, TagButton } from "@/components/design/Tag";
import { Meter } from "@/components/design/Meter";
import { poolDisplay } from "@/components/PoolTable";
import { AmountField, FormMessage } from "@/components/design/InputField";
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

// Kept back from the balance for the network fee (~0.03 USDC; ~0.08 on a
// wallet's first transaction, which also deploys it).
const GAS_BUFFER_USDC = 0.1;

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
  const { balance, refresh: refreshBalance } = useWalletBalance();
  const fxRate = useFxRate(pool.target_currency);

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
        body: JSON.stringify({ txHash }),
      });
      const body = await safeJson(response);
      if (!response.ok) throw new Error((body?.error as string) ?? "Failed to record contribution");
      if (body) setState((prev) => ({ ...prev, ...body }));
      setAmount("");
      setContributeStatus("idle");
      refreshBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Contribution failed";
      const closed = /not open|deadline|closed/i.test(msg);
      const { cancelled, message } = friendlyPasskeyError(err);
      if (cancelled) {
        // Cancelling the passkey prompt is normal — no error.
        setContributeStatus("idle");
      } else {
        setContributeStatus("error");
        console.error("Contribution failed:", err);
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
      const { cancelled, message } = friendlyPasskeyError(err);
      if (cancelled) {
        setRefundStatus("idle");
      } else {
        setRefundStatus("error");
        const msg = err instanceof Error ? err.message : "";
        setErrorMessage(/nothing to refund/i.test(msg) ? "This refund has already been claimed." : message);
      }
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
  const showLiveOpen = canContribute; // drives the "Open" badge
  const display = poolDisplay(state.status, pool.deadline, endedByDeadline);
  // Contributors pay their own gas from their USDC, so hold a little back.
  const insufficient = balance !== null && !!amount && Number(amount) > Number(balance) - GAS_BUFFER_USDC;
  const lowForGas = balance !== null && Number(balance) < GAS_BUFFER_USDC;
  const refundClaimed = viewerClaimed || refundStatus === "done";

  return (
    <div>
      {/* Header */}
      <Tag tone={display.tone}>{display.label}</Tag>
      <h1 className="type-heading-lg mt-6 max-w-4xl [overflow-wrap:anywhere]">{pool.title}</h1>
      {pool.description && <p className="type-subheading mt-5 max-w-2xl opacity-80">{pool.description}</p>}

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Progress — first on mobile, top-left on desktop */}
        <div className="order-1 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <SurfaceCard>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="stat-callout__value">
                  <CountUp value={current} prefix="$" />
                </p>
                <p className="stat-callout__label mt-2">
                  raised so far
                  {pool.target_currency && fxRate !== null && (
                    <span className="font-dm-mono text-char"> · ≈ {formatLocal(Number(current) * fxRate, pool.target_currency)}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="type-heading-sm tnum">{Math.round(pct)}%</p>
                <p className="font-dm-mono text-sm text-char">of ${formatUsdc(target)}</p>
              </div>
            </div>
            <Meter value={pct} tone={display.meter} className="mt-8" label={`${Math.round(pct)}% funded`} />

            <WarmCard className="mt-8 grid grid-cols-1 gap-5 !p-6 sm:grid-cols-3 sm:gap-4">
              <div>
                <p className="text-sm text-char">Contributors</p>
                <p className="type-mono mt-2">{contributorCount}</p>
              </div>
              <div>
                <p className="text-sm text-char">Release</p>
                <p className={`type-mono mt-2 ${showLiveOpen && time.urgent ? "underline decoration-2 underline-offset-4" : ""}`}>
                  {showLiveOpen ? time.label : endedByDeadline ? "Ended" : status.label}
                </p>
              </div>
              <div>
                <p className="text-sm text-char">Target</p>
                <p className="type-mono mt-2">
                  {pool.target_currency && fxRate !== null
                    ? formatLocal(Number(target) * fxRate, pool.target_currency)
                    : `$${formatUsdc(target, { decimals: 0 })}`}
                </p>
              </div>
            </WarmCard>
          </SurfaceCard>
        </div>

        {/* Released summary + funding history — below progress on desktop */}
        <div className="order-3 space-y-6 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-2">
          {state.status === "released" && (
            <SurfaceCard className="border-[1.5px] border-ink-black">
              <Tag tone="black">Released</Tag>
              <p className="type-heading-sm mt-5">Funds released to the recipient</p>
              <p className="type-mono mt-3">
                ${formatUsdc(state.currentAmount)} USDC
              </p>
              {state.localCurrencyAmount ? (
                <p className="mt-1 text-sm text-char">
                  ≈ {formatLocal(state.localCurrencyAmount, state.targetCurrency)} (rate {String(state.fxRate)}, informational)
                </p>
              ) : null}
              {(state.txHash ?? pool.release_tx_hash) && (
                <a
                  href={txUrl((state.txHash ?? pool.release_tx_hash)!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-body font-medium underline underline-offset-4"
                >
                  View release on-chain ↗
                </a>
              )}
            </SurfaceCard>
          )}

          <SurfaceCard>
            <h2 className="type-heading-sm">Funding history</h2>
            {contributions.length === 0 ? (
              <WarmCard className="mt-6 !py-12 text-center text-body">No contributions yet. Be the first to chip in.</WarmCard>
            ) : (
              <ul className="mt-4">
                {contributions.map((c) => (
                  <li key={c.id} className="ledger-row flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-dm-mono text-body">{c.contributor ? shortAddress(c.contributor) : "Anonymous"}</p>
                      <p className="text-sm text-char">
                        {timeAgo(c.created_at)}
                        {c.tx_hash && (
                          <>
                            {" · "}
                            <a href={txUrl(c.tx_hash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                              on-chain ↗
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="type-mono shrink-0">+${formatUsdc(c.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
            <a
              href={addressUrl(poolEscrowAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block border-t border-oat pt-4 font-dm-mono text-sm text-char hover:text-ink-black hover:underline"
            >
              Held in escrow contract {shortAddress(poolEscrowAddress)} ↗
            </a>
          </SurfaceCard>
        </div>

        {/* Action card — under progress on mobile; sticky right column on desktop */}
        <div className="order-2 lg:order-none lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <SurfaceCard className="lg:sticky lg:top-20">
            {canContribute && (
              <>
                <h2 className="type-heading-sm">Contribute</h2>
                <p className="mt-2 text-body text-char">Chip in any amount. It settles in seconds; a network fee of a few cents comes from your balance.</p>
                {isLoggedIn ? (
                  <div className="mt-6 flex flex-col gap-4">
                    <AmountField
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      aria-label="Amount in USDC"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[10, 25, 50, 100].map((v) => (
                        <TagButton key={v} selected={amount === String(v)} onClick={() => setAmount(String(v))}>
                          ${v}
                        </TagButton>
                      ))}
                    </div>
                    {insufficient ? (
                      <PillLink href="/settings" block>
                        Add funds
                      </PillLink>
                    ) : (
                      <PillButton
                        onClick={handleContribute}
                        block
                        disabled={!amount || Number(amount) <= 0 || contributeStatus === "working"}
                      >
                        {contributeStatus === "working" ? "Confirming…" : "Contribute with passkey"}
                      </PillButton>
                    )}
                    <div className="flex items-center justify-between font-dm-mono text-sm text-char">
                      <span>Balance: {balance !== null ? `$${formatUsdc(balance)}` : "—"}</span>
                      {viewerWalletAddress && <span>{shortAddress(viewerWalletAddress)}</span>}
                    </div>
                    {insufficient && (
                      <FormMessage>
                        That&apos;s more than your balance allows. Keep about ${GAS_BUFFER_USDC.toFixed(2)} for the network fee, or add funds by sending USDC on the Arc network to your wallet address.
                      </FormMessage>
                    )}
                  </div>
                ) : (
                  <div className="mt-6">
                    <PillLink href={`/register?next=/pools/${pool.id}`} block>
                      Sign in to contribute
                    </PillLink>
                    <p className="mt-4 text-center text-sm text-char">
                      Takes a few seconds with a passkey. Already have one?{" "}
                      <Link href={`/login?next=/pools/${pool.id}`} className="font-medium text-ink-black underline underline-offset-2">
                        Log in
                      </Link>
                    </p>
                  </div>
                )}
              </>
            )}

            {endedByDeadline && (
              <>
                <h2 className="type-heading-sm">Pool ended</h2>
                <p className="mt-2 text-body text-char">
                  Contributions are closed. If the goal was met, funds release to the recipient; otherwise contributors can claim a refund shortly.
                </p>
                <PillButton variant="black" block className="mt-6" disabled>
                  Pool ended
                </PillButton>
              </>
            )}

            {state.status === "refunded" &&
              (viewerContributed ? (
                <>
                  <h2 className="type-heading-sm">Claim your refund</h2>
                  <p className="mt-2 text-body text-char">
                    This pool didn&apos;t reach its goal in time. Your contribution is available to withdraw.
                  </p>
                  {isLoggedIn ? (
                    <>
                      <PillButton
                        onClick={handleRefund}
                        block
                        className="mt-6"
                        disabled={refundClaimed || refundStatus === "working"}
                      >
                        {refundClaimed ? "Refund claimed" : refundStatus === "working" ? "Claiming…" : "Claim refund"}
                      </PillButton>
                      {!refundClaimed && lowForGas && (
                        <FormMessage className="mt-4">
                          Claiming needs a few cents of USDC for the network fee. Add a little USDC to your wallet first.
                        </FormMessage>
                      )}
                    </>
                  ) : (
                    <PillLink href={`/login?next=/pools/${pool.id}`} block className="mt-6">
                      Sign in to claim
                    </PillLink>
                  )}
                </>
              ) : (
                <>
                  <h2 className="type-heading-sm">Pool refunded</h2>
                  <p className="mt-2 text-body text-char">
                    This pool didn&apos;t reach its goal, so contributions were returned to everyone who gave.
                  </p>
                </>
              ))}

            {state.status === "released" && (
              <>
                <h2 className="type-heading-sm">Goal reached</h2>
                <p className="mt-2 text-body text-char">This pool is complete and funds have been released.</p>
              </>
            )}

            {state.status === "cancelled" && (
              <>
                <h2 className="type-heading-sm">Pool cancelled</h2>
                <p className="mt-2 text-body text-char">This pool is no longer accepting contributions.</p>
              </>
            )}

            {errorMessage && <FormMessage className="mt-5">{errorMessage}</FormMessage>}

            <PillButton variant="outlined" block onClick={copyLink} className="mt-4">
              {copied ? "Link copied" : "Share pool"}
            </PillButton>

            <p className="mt-6 border-t border-oat pt-5 text-center text-sm text-char">Funds secured in on-chain escrow</p>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
