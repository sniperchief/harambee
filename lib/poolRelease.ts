import { createCircleClient } from "./circle";
import { convertUsdcToLocal } from "./localFx";
import { getPlatformWalletId } from "./platformWallet";
import { getPoolEscrowAddress, readOnchainPool, type OnchainPool } from "./poolEscrow";
import { createServiceClient } from "./supabase";

// Syncs Supabase from an on-chain pool and returns the client-facing
// result. Local-currency display is release-only and best-effort.
export async function finalize(
  poolId: string,
  targetCurrency: string | null | undefined,
  state: OnchainPool,
  txHash?: string
) {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = { current_amount: state.currentAmount, status: state.status };
  // Persist the release tx so the pool page can link it on the explorer. Only
  // on a real release-with-tx — never overwrite an existing hash with null when
  // we hit the idempotent, already-terminal path (no txHash).
  if (txHash && state.status === "released") {
    update.release_tx_hash = txHash;
  }
  await supabase.from("pools").update(update).eq("id", poolId);

  let localCurrencyAmount: string | undefined;
  let fxRate: number | undefined;
  if (state.status === "released" && targetCurrency) {
    try {
      const converted = await convertUsdcToLocal(state.currentAmount, targetCurrency);
      localCurrencyAmount = converted.localAmount;
      fxRate = converted.rate;
      await supabase
        .from("pools")
        .update({ local_currency_amount: localCurrencyAmount, fx_rate: fxRate })
        .eq("id", poolId);
    } catch (err) {
      console.error("Local currency conversion failed:", err);
    }
  }

  return {
    currentAmount: state.currentAmount,
    status: state.status,
    ...(txHash && { txHash }),
    ...(localCurrencyAmount && { localCurrencyAmount, targetCurrency, fxRate }),
  };
}

// Calls checkAndRelease on-chain for a single pool from the platform wallet,
// then re-syncs Supabase from the contract's own post-call state (source of
// truth). The platform wallet is only paying gas here: checkAndRelease is
// permissionless and the contract decides where the money goes.
//
// Idempotent by design: if the pool is already terminal (a concurrent poll,
// the cron, or another viewer released/refunded it first), we skip the
// transaction entirely; and if the submission itself reverts because we lost
// that race, we swallow it and just sync the terminal state. This is what
// keeps overlapping callers from spamming "pool not open" failures.
export async function checkAndReleasePool(poolId: string, onchainPoolId: string, targetCurrency?: string | null) {
  // Don't submit a checkAndRelease against a pool that's no longer open.
  const pre = await readOnchainPool(onchainPoolId);
  if (pre.status !== "open") {
    return finalize(poolId, targetCurrency, pre);
  }

  let txHash: string | undefined;
  try {
    const walletsClient = createCircleClient();
    const txResponse = await walletsClient.createContractExecutionTransaction({
      walletId: getPlatformWalletId(),
      contractAddress: getPoolEscrowAddress(),
      abiFunctionSignature: "checkAndRelease(uint256)",
      abiParameters: [onchainPoolId],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    const transactionId = txResponse.data?.id;
    if (!transactionId) throw new Error("checkAndRelease transaction did not return an id");
    const confirmed = await walletsClient.getTransaction({ id: transactionId, waitForState: "CONFIRMED" });
    txHash = confirmed.data?.transaction?.txHash;
  } catch (err) {
    // Most likely a concurrent caller closed the pool first ("pool not open"),
    // or a transient RPC error. Either way, re-read and sync the real state
    // rather than throwing.
    console.error("checkAndRelease did not complete (syncing on-chain state instead):", err);
  }

  const post = await readOnchainPool(onchainPoolId);
  // Only link a tx that actually closed the pool.
  return finalize(poolId, targetCurrency, post, post.status !== "open" ? txHash : undefined);
}
