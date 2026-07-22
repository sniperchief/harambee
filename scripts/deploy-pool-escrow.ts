import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createCircleContractsClient } from "../lib/circleContracts";

// Usage: npm run contracts:deploy-pool-escrow -- <walletId>
// walletId must be a Developer-Controlled Wallet with a native testnet
// balance to cover deployment gas (e.g. the funded Wallet A from Step 5).
// Requires YIELD_VAULT_CONTRACT_ADDRESS in .env.local (deploy the vault
// first via npm run contracts:deploy-yield-vault).
async function main() {
  const walletId = process.argv[2];
  if (!walletId) {
    throw new Error("Usage: npm run contracts:deploy-pool-escrow -- <walletId>");
  }

  const vaultAddress = process.env.YIELD_VAULT_CONTRACT_ADDRESS;
  if (!vaultAddress) {
    throw new Error("Missing YIELD_VAULT_CONTRACT_ADDRESS in .env.local — deploy the vault first");
  }

  const artifactPath = path.join(__dirname, "../contracts/artifacts/PoolEscrow.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const client = createCircleContractsClient();

  const deployResponse = await client.deployContract({
    name: "PoolEscrow",
    description: "Harambee pool escrow contract",
    walletId,
    blockchain: "ARC-TESTNET",
    abiJson: JSON.stringify(artifact.abi),
    bytecode: artifact.bytecode,
    constructorParameters: [vaultAddress],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const contractId = deployResponse.data?.contractId;
  if (!contractId) {
    throw new Error("Deployment did not return a contractId");
  }

  console.log("Deployment submitted. Contract id:", contractId);
  console.log("Waiting for confirmation...");

  let contractAddress: string | undefined;
  for (let i = 0; i < 30; i++) {
    const contractResponse = await client.getContract({ id: contractId });
    const contract = contractResponse.data?.contract;

    if (contract?.status === "COMPLETE") {
      contractAddress = contract.contractAddress;
      break;
    }
    if (contract?.status === "FAILED") {
      throw new Error(
        `Deployment failed: ${contract.deploymentErrorReason ?? "unknown reason"}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (!contractAddress) {
    throw new Error("Timed out waiting for contract deployment to complete");
  }

  console.log("Deployed! Contract address:", contractAddress);
  console.log("Add this to .env.local:");
  console.log(`POOL_ESCROW_CONTRACT_ADDRESS=${contractAddress}`);

  fs.writeFileSync(
    path.join(__dirname, "../contracts/artifacts/PoolEscrow.deployment.json"),
    JSON.stringify({ contractId, contractAddress }, null, 2)
  );
}

main().catch((err) => {
  console.error("deploy-pool-escrow failed:", err);
  process.exit(1);
});
