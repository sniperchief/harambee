import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";

// Usage: npm run contracts:wire-vault -- <walletId>
// One-time step after both contracts are deployed: tells the vault which
// PoolEscrow address is allowed to call deposit/withdrawAll. walletId must
// be the same wallet that deployed the vault (it's the vault's owner).
async function main() {
  const walletId = process.argv[2];
  if (!walletId) {
    throw new Error("Usage: npm run contracts:wire-vault -- <walletId>");
  }

  const vaultAddress = process.env.YIELD_VAULT_CONTRACT_ADDRESS;
  const poolEscrowAddress = process.env.POOL_ESCROW_CONTRACT_ADDRESS;
  if (!vaultAddress || !poolEscrowAddress) {
    throw new Error(
      "Missing YIELD_VAULT_CONTRACT_ADDRESS or POOL_ESCROW_CONTRACT_ADDRESS in .env.local"
    );
  }

  const client = createCircleClient();

  const txResponse = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: vaultAddress,
    abiFunctionSignature: "setPoolEscrow(address)",
    abiParameters: [poolEscrowAddress],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    throw new Error("setPoolEscrow transaction did not return an id");
  }

  console.log("Wiring submitted. Waiting for confirmation...");
  const confirmed = await client.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

  console.log("Vault wired to PoolEscrow. State:", confirmed.data?.transaction?.state);
}

main().catch((err) => {
  console.error("wire-vault failed:", err);
  process.exit(1);
});
