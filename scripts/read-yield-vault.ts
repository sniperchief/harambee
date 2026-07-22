import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createCircleContractsClient } from "../lib/circleContracts";

// Read-only smoke test: queries getPrincipal(0) and getAccruedYield(0) on
// the deployed vault. Since no pool has contributed yet, expect zero for both.
async function main() {
  const vaultAddress = process.env.YIELD_VAULT_CONTRACT_ADDRESS;
  if (!vaultAddress) {
    throw new Error("Missing YIELD_VAULT_CONTRACT_ADDRESS in .env.local");
  }

  const artifactPath = path.join(__dirname, "../contracts/artifacts/YieldVault.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiJson = JSON.stringify(artifact.abi);

  const client = createCircleContractsClient();

  const principal = await client.queryContract({
    address: vaultAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getPrincipal(uint256)",
    abiParameters: [0],
  });

  const yieldResponse = await client.queryContract({
    address: vaultAddress,
    blockchain: "ARC-TESTNET",
    abiJson,
    abiFunctionSignature: "getAccruedYield(uint256)",
    abiParameters: [0],
  });

  console.log("getPrincipal(0):", principal.data?.outputValues);
  console.log("getAccruedYield(0):", yieldResponse.data?.outputValues);
}

main().catch((err) => {
  console.error("read-yield-vault failed:", err);
  process.exit(1);
});
