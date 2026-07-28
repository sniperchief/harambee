import * as fs from "fs";
import * as path from "path";
import { formatEther, parseEther } from "viem";
import { createCircleContractsClient } from "./circleContracts";

let cachedAbiJson: string | undefined;

export function getYieldVaultAbiJson(): string {
  if (!cachedAbiJson) {
    const artifactPath = path.join(process.cwd(), "contracts/artifacts/YieldVault.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    cachedAbiJson = JSON.stringify(artifact.abi);
  }
  return cachedAbiJson;
}

export function getYieldVaultAddress(): string {
  const address = process.env.YIELD_VAULT_CONTRACT_ADDRESS;
  if (!address) throw new Error("Missing YIELD_VAULT_CONTRACT_ADDRESS in .env.local");
  return address;
}

// Yield earned so far for a pool = (vault principal + pending accrued) minus the
// principal actually contributed (the escrow's currentAmount). The vault folds
// accrued yield into principal on each deposit, so we add the still-pending
// accrual on top. Server-only. Returns a decimal string, or null on failure.
export async function getPoolYieldUsdc(
  onchainPoolId: string,
  currentAmountUsdc: string | number
): Promise<string | null> {
  try {
    const client = createCircleContractsClient();
    const address = getYieldVaultAddress();
    const abiJson = getYieldVaultAbiJson();

    const [principalRes, accruedRes] = await Promise.all([
      client.queryContract({
        address,
        blockchain: "ARC-TESTNET",
        abiJson,
        abiFunctionSignature: "getPrincipal(uint256)",
        abiParameters: [onchainPoolId],
      }),
      client.queryContract({
        address,
        blockchain: "ARC-TESTNET",
        abiJson,
        abiFunctionSignature: "getAccruedYield(uint256)",
        abiParameters: [onchainPoolId],
      }),
    ]);

    const principalWei = BigInt(principalRes.data?.outputValues?.[0] ?? "0");
    const accruedWei = BigInt(accruedRes.data?.outputValues?.[0] ?? "0");
    const contributedWei = parseEther(String(currentAmountUsdc || "0"));

    let yieldWei = principalWei + accruedWei - contributedWei;
    if (yieldWei < 0n) yieldWei = 0n;
    return formatEther(yieldWei);
  } catch (err) {
    console.error("Pool yield read failed:", err);
    return null;
  }
}
