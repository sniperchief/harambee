"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { contributeWithPasskey, refundWithPasskey } from "@/lib/poolContribute";

type Pool = {
  id: string;
  title: string;
  description: string | null;
  target_amount: string | number;
  current_amount: string | number;
  deadline: string;
  status: "open" | "released" | "refunded" | "cancelled";
  onchain_pool_id: string;
  target_currency: string | null;
  local_currency_amount: string | number | null;
  fx_rate: string | number | null;
};

type PoolState = {
  currentAmount: string | number;
  status: Pool["status"];
  finalValue?: string;
  localCurrencyAmount?: string | number | null;
  targetCurrency?: string | null;
  fxRate?: string | number | null;
};

const POLL_INTERVAL_MS = 4000;

export function PoolDetail({
  pool,
  poolEscrowAddress,
  isLoggedIn,
  viewerWalletAddress,
}: {
  pool: Pool;
  poolEscrowAddress: `0x${string}`;
  isLoggedIn: boolean;
  viewerWalletAddress: string | null;
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

  useEffect(() => {
    if (state.status !== "open") return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/pools/${pool.id}/sync`, { method: "POST" });
      if (response.ok) {
        const body = await response.json();
        setState((prev) => ({ ...prev, ...body }));
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
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to record contribution");
      setState((prev) => ({ ...prev, ...body }));
      setAmount("");
      setContributeStatus("idle");
    } catch (err) {
      setContributeStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Contribution failed");
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

  const target = Number(pool.target_amount);
  const current = Number(state.currentAmount);
  const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div className="flex w-96 flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{pool.title}</h1>
        {pool.description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{pool.description}</p>
        )}
      </div>

      <span className="w-fit rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {state.status}
      </span>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full bg-black dark:bg-white" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {current} / {target} USDC
        </p>
        <p className="text-xs text-zinc-500">Deadline: {new Date(pool.deadline).toLocaleString()}</p>
      </div>

      {state.status === "released" && (
        <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="font-medium text-black dark:text-zinc-50">
            Released: {state.finalValue ?? state.currentAmount} USDC
          </p>
          {state.localCurrencyAmount && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ≈ {state.localCurrencyAmount} {state.targetCurrency} (rate {state.fxRate}, informational
              only)
            </p>
          )}
        </div>
      )}

      {state.status === "open" && (
        <div className="flex flex-col gap-2">
          {isLoggedIn ? (
            <>
              <TextInput
                type="number"
                step="0.000001"
                min="0"
                placeholder="Amount (USDC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button onClick={handleContribute} disabled={!amount || contributeStatus === "working"}>
                {contributeStatus === "working" ? "Contributing..." : "Contribute with passkey"}
              </Button>
              {viewerWalletAddress && (
                <p className="text-xs text-zinc-500">
                  Signing as {viewerWalletAddress.slice(0, 6)}…{viewerWalletAddress.slice(-4)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <a href={`/register?next=/pools/${pool.id}`} className="underline">
                Register
              </a>{" "}
              or{" "}
              <a href={`/login?next=/pools/${pool.id}`} className="underline">
                log in
              </a>{" "}
              with a passkey to contribute.
            </p>
          )}
        </div>
      )}

      {state.status === "refunded" && isLoggedIn && (
        <div className="flex flex-col gap-2">
          <Button onClick={handleRefund} disabled={refundStatus === "working" || refundStatus === "done"}>
            {refundStatus === "done"
              ? "Refund claimed"
              : refundStatus === "working"
                ? "Claiming..."
                : "Claim your refund"}
          </Button>
        </div>
      )}

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  );
}
