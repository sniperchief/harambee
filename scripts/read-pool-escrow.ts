import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createCircleContractsClient } from "../lib/circleContracts";

// Read-only smoke test: queries getPool(0) on the deployed contract. Since no
// pool has been created yet (that's Step 7), this just proves the deployed
// bytecode is live and queryable — expect zeroed-out defaults back.
async function main() {
  const contractAddress = process.env.POOL_ESCROW_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Missing POOL_ESCROW_CONTRACT_ADDRESS in .env.local");
  }

  const artifactPath = path.join(__dirname, "../contracts/artifacts/PoolEscrow.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const client = createCircleContractsClient();

  // abiJson is required for Circle to decode the raw return data into typed
  // outputValues — abiFunctionSignature alone only encodes the call's inputs.
  const response = await client.queryContract({
    address: contractAddress,
    blockchain: "ARC-TESTNET",
    abiJson: JSON.stringify(artifact.abi),
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [0],
  });

  console.log("getPool(0):", response.data?.outputValues);
}

main().catch((err) => {
  console.error("read-pool-escrow failed:", err);
  process.exit(1);
});
