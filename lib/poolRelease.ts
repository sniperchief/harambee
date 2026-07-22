import { formatEther } from "viem";
import { createCircleClient } from "./circle";
import { createCircleContractsClient } from "./circleContracts";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "./poolEscrow";
import { createServiceClient } from "./supabase";

const STATUS_BY_INDEX = ["open", "released", "refunded"] as const;

// Calls checkAndRelease on-chain for a single pool, then re-syncs Supabase
// from the contract's own post-call state (source of truth, same pattern
// as the contribute route).
export async function checkAndReleasePool(
  poolId: string,
  onchainPoolId: string,
  walletId: string
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

  const supabase = createServiceClient();
  await supabase
    .from("pools")
    .update({ current_amount: formatEther(BigInt(currentAmountWei)), status })
    .eq("id", poolId);

  return {
    status,
    finalValue: formatEther(BigInt(finalValueWei)),
    txHash: confirmed.data?.transaction?.txHash,
  };
}
