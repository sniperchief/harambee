import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createCircleContractsClient } from "../lib/circleContracts";
import { ARC_CHAIN_ID, CIRCLE_BLOCKCHAIN } from "../lib/network";

// Usage: npm run contracts:deploy-pool-escrow [-- <walletId>]
// Deploys contracts/artifacts/PoolEscrow.json to Arc MAINNET through Circle
// Contracts. walletId defaults to HARAMBEE_PLATFORM_WALLET_ID and must be a
// Developer-Controlled wallet on ARC holding a little USDC for gas. Run
// `npm run contracts:compile-pool-escrow` and `npm run test:contracts` first.
async function main() {
  const walletId = process.argv[2] ?? process.env.HARAMBEE_PLATFORM_WALLET_ID;
  if (!walletId) {
    throw new Error("Usage: npm run contracts:deploy-pool-escrow -- <walletId> (or set HARAMBEE_PLATFORM_WALLET_ID)");
  }

  const artifactPath = path.join(__dirname, "../contracts/artifacts/PoolEscrow.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const client = createCircleContractsClient();

  const deployResponse = await client.deployContract({
    name: "PoolEscrow",
    description: "Harambee pool escrow contract",
    walletId,
    blockchain: CIRCLE_BLOCKCHAIN,
    abiJson: JSON.stringify(artifact.abi),
    bytecode: artifact.bytecode,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const contractId = deployResponse.data?.contractId;
  if (!contractId) {
    throw new Error("Deployment did not return a contractId");
  }

  console.log("Deployment submitted. Contract id:", contractId);
  console.log("Waiting for confirmation...");

  let contractAddress: string | undefined;
  let txHash: string | undefined;
  for (let i = 0; i < 60; i++) {
    const contractResponse = await client.getContract({ id: contractId });
    const contract = contractResponse.data?.contract;

    if (contract?.status === "COMPLETE") {
      contractAddress = contract.contractAddress;
      txHash = contract.txHash;
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
  console.log("Set this in the environment:");
  console.log(`POOL_ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("Verify on the explorer with:");
  console.log(`npx hardhat verify --network arc ${contractAddress}`);

  fs.writeFileSync(
    path.join(__dirname, "../contracts/artifacts/PoolEscrow.deployment.json"),
    JSON.stringify(
      { chainId: ARC_CHAIN_ID, blockchain: CIRCLE_BLOCKCHAIN, contractId, contractAddress, txHash },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("deploy-pool-escrow failed:", err);
  process.exit(1);
});
