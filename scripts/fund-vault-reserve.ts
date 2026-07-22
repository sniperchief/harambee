import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";

// Usage: npm run contracts:fund-vault-reserve -- <walletId> <amount>
// The vault's simulated APY isn't backed by real incoming value (see
// YieldVault.sol's fundReserve() comment) — this tops up its reserve with
// real native currency so withdrawAll can actually pay out principal+yield.
async function main() {
  const walletId = process.argv[2];
  const amount = process.argv[3];
  if (!walletId || !amount) {
    throw new Error("Usage: npm run contracts:fund-vault-reserve -- <walletId> <amount>");
  }

  const vaultAddress = process.env.YIELD_VAULT_CONTRACT_ADDRESS;
  if (!vaultAddress) {
    throw new Error("Missing YIELD_VAULT_CONTRACT_ADDRESS in .env.local");
  }

  const client = createCircleClient();
  const txResponse = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: vaultAddress,
    abiFunctionSignature: "fundReserve()",
    abiParameters: [],
    amount,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    throw new Error("fundReserve transaction did not return an id");
  }

  console.log("Funding submitted. Waiting for confirmation...");
  const confirmed = await client.getTransaction({
    id: transactionId,
    waitForState: "CONFIRMED",
  });

  console.log("Vault reserve funded. txHash:", confirmed.data?.transaction?.txHash);
}

main().catch((err) => {
  console.error("fund-vault-reserve failed:", err);
  process.exit(1);
});
