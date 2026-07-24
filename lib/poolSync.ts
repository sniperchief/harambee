import { formatEther } from "viem";
import { createCircleContractsClient } from "./circleContracts";
import { getPlatformWalletId } from "./platformWallet";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "./poolEscrow";
import { checkAndReleasePool } from "./poolRelease";
import { createServiceClient } from "./supabase";

const STATUS_BY_INDEX = ["open", "released", "refunded"] as const;

// Shared by the sync and contribute-confirm routes: re-reads a pool's
// on-chain state, syncs Supabase from it, and triggers release if either
// condition is now met (even if a previous call already released/refunded
// it on-chain but Supabase hasn't caught up yet). Read-only otherwise, same
// as the cron route's per-pool logic.
export async function syncPoolFromChain(
  poolId: string,
  onchainPoolId: string,
  targetCurrency: string | null
) {
  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();
  const contractsClient = createCircleContractsClient();

  const stateResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [onchainPoolId],
  });
  const [, targetAmountWei, currentAmountWei, deadlineStr, statusIndex, finalValueWei] =
    stateResponse.data?.outputValues ?? [];

  const currentAmount = formatEther(BigInt(currentAmountWei));
  const status = STATUS_BY_INDEX[Number(statusIndex)] ?? "open";
  const thresholdMet = BigInt(currentAmountWei) >= BigInt(targetAmountWei);
  const deadlinePassed = Math.floor(Date.now() / 1000) >= Number(deadlineStr);

  if (status === "open" && (thresholdMet || deadlinePassed)) {
    const result = await checkAndReleasePool(
      poolId,
      onchainPoolId,
      getPlatformWalletId(),
      targetCurrency
    );
    return { currentAmount, ...result };
  }

  const supabase = createServiceClient();
  await supabase.from("pools").update({ current_amount: currentAmount, status }).eq("id", poolId);

  return {
    currentAmount,
    status,
    finalValue: status !== "open" ? formatEther(BigInt(finalValueWei)) : undefined,
  };
}
