import { formatEther } from "viem";
import { createCircleClient } from "./circle";
import { createCircleContractsClient } from "./circleContracts";
import { convertUsdcToLocal } from "./localFx";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "./poolEscrow";
import { createServiceClient } from "./supabase";

const STATUS_BY_INDEX = ["open", "released", "refunded"] as const;

type ContractsClient = ReturnType<typeof createCircleContractsClient>;

type PoolState = {
  status: (typeof STATUS_BY_INDEX)[number];
  currentAmount: string;
  finalValue: string;
};

async function readPoolState(
  contractsClient: ContractsClient,
  contractAddress: string,
  abiJson: string,
  onchainPoolId: string
): Promise<PoolState> {
  const stateResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [onchainPoolId],
  });
  const [, , currentAmountWei, , statusIndex, finalValueWei] = stateResponse.data?.outputValues ?? [];
  return {
    status: STATUS_BY_INDEX[Number(statusIndex)] ?? "open",
    currentAmount: formatEther(BigInt(currentAmountWei)),
    finalValue: formatEther(BigInt(finalValueWei)),
  };
}

// Syncs Supabase from an on-chain PoolState and returns the client-facing
// result. Local-currency display is release-only and best-effort.
async function finalize(poolId: string, targetCurrency: string | null | undefined, state: PoolState, txHash?: string) {
  const supabase = createServiceClient();
  await supabase.from("pools").update({ current_amount: state.currentAmount, status: state.status }).eq("id", poolId);

  let localCurrencyAmount: string | undefined;
  let fxRate: number | undefined;
  if (state.status === "released" && targetCurrency) {
    try {
      const converted = await convertUsdcToLocal(state.finalValue, targetCurrency);
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
    status: state.status,
    finalValue: state.status !== "open" ? state.finalValue : undefined,
    ...(txHash && { txHash }),
    ...(localCurrencyAmount && { localCurrencyAmount, targetCurrency, fxRate }),
  };
}

// Calls checkAndRelease on-chain for a single pool, then re-syncs Supabase
// from the contract's own post-call state (source of truth).
//
// Idempotent by design: if the pool is already terminal (a concurrent poll,
// the cron, or another viewer released/refunded it first), we skip the
// transaction entirely; and if the submission itself reverts because we lost
// that race, we swallow it and just sync the terminal state. This is what
// keeps overlapping callers from spamming "pool not open" failures.
export async function checkAndReleasePool(
  poolId: string,
  onchainPoolId: string,
  walletId: string,
  targetCurrency?: string | null
) {
  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();
  const contractsClient = createCircleContractsClient();

  // Don't submit a checkAndRelease against a pool that's no longer open.
  const pre = await readPoolState(contractsClient, contractAddress, abiJson, onchainPoolId);
  if (pre.status !== "open") {
    return finalize(poolId, targetCurrency, pre);
  }

  let txHash: string | undefined;
  try {
    const walletsClient = createCircleClient();
    const txResponse = await walletsClient.createContractExecutionTransaction({
      walletId,
      contractAddress,
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

  const post = await readPoolState(contractsClient, contractAddress, abiJson, onchainPoolId);
  return finalize(poolId, targetCurrency, post, txHash);
}
