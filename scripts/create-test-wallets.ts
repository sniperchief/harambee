import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";

// One-time setup for Step 5: creates two SCA (smart contract account) wallets
// on Arc testnet. Gas Station sponsorship on EVM chains requires SCA wallets,
// not the EOA wallets created by /api/wallets in Step 3.
async function main() {
  const client = createCircleClient();
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!walletSetId) {
    throw new Error("Missing CIRCLE_WALLET_SET_ID in .env.local");
  }

  const response = await client.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 2,
    accountType: "SCA",
  });

  const [walletA, walletB] = response.data?.wallets ?? [];

  console.log("Wallet A (sender):", { id: walletA?.id, address: walletA?.address });
  console.log("Wallet B (recipient):", { id: walletB?.id, address: walletB?.address });
  console.log("");
  console.log("Next: fund Wallet A via the faucet:");
  console.log(
    `npm run circle:fund-test-wallet -- ${walletA?.address}`
  );
}

main().catch((err) => {
  console.error("create-test-wallets failed:", err);
  process.exit(1);
});
