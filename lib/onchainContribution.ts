import { createCircleContractsClient } from "./circleContracts";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "./poolEscrow";

// A contributor's remaining on-chain contribution for a pool. After a refund is
// claimed the contract zeroes this, so 0 means "already claimed" (for someone
// who is known to have contributed). Server-only. null on read failure.
export async function getOnchainContribution(
  onchainPoolId: string,
  address: string
): Promise<bigint | null> {
  try {
    const client = createCircleContractsClient();
    const res = await client.queryContract({
      address: getPoolEscrowAddress(),
      blockchain: "ARC-TESTNET",
      abiJson: getPoolEscrowAbiJson(),
      abiFunctionSignature: "contributions(uint256,address)",
      abiParameters: [onchainPoolId, address],
    });
    return BigInt(res.data?.outputValues?.[0] ?? "0");
  } catch (err) {
    console.error("On-chain contribution read failed:", err);
    return null;
  }
}
