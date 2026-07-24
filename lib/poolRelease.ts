import { formatEther } from "viem";
import { createCircleClient } from "./circle";
import { createCircleContractsClient } from "./circleContracts";
import { convertUsdcToLocal } from "./localFx";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "./poolEscrow";
import { createServiceClient } from "./supabase";

const STATUS_BY_INDEX = ["open", "released", "refunded"] as const;

// Calls checkAndRelease on-chain for a single pool, then re-syncs Supabase
// from the contract's own post-call state (source of truth, same pattern
// as the contribute route). targetCurrency is optional and passed in by
// callers that already have the pool row loaded, rather than re-querying
// Supabase here.
export async function checkAndReleasePool(
  poolId: string,
  onchainPoolId: string,
  walletId: string,
  targetCurrency?: string | null
) {
  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();

  const walletsClient = createCircleClient();
  const txResponse = await walletsClient.createContractExecutionTransaction({
    walletId,
    contractAddress,
    abiFunctionSignature: "checkAndRelease(uint256)",
    abiParameters: [onchainPoolId],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    throw new Error("checkAndRelease transaction did not return an id");
  }

  const confirmed = await walletsClient.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

  const contractsClient = createCircleContractsClient();
  const stateResponse = await contractsClient.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [onchainPoolId],
  });
  const [, , currentAmountWei, , statusIndex, finalValueWei] =
    stateResponse.data?.outputValues ?? [];
  const status = STATUS_BY_INDEX[Number(statusIndex)] ?? "open";

  const finalValue = formatEther(BigInt(finalValueWei));

  const supabase = createServiceClient();
  await supabase
    .from("pools")
    .update({ current_amount: formatEther(BigInt(currentAmountWei)), status })
    .eq("id", poolId);

  // Local-currency display is release-only (a single recipient amount) and
  // best-effort: a rate-feed hiccup shouldn't undo an on-chain release that
  // already succeeded, so failures here are swallowed and just omitted from
  // the response.
  let localCurrencyAmount: string | undefined;
  let fxRate: number | undefined;
  if (status === "released" && targetCurrency) {
    try {
      const converted = await convertUsdcToLocal(finalValue, targetCurrency);
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
    status,
    finalValue,
    txHash: confirmed.data?.transaction?.txHash,
    ...(localCurrencyAmount && { localCurrencyAmount, targetCurrency, fxRate }),
  };
}
