import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";

// One-time setup: creates the wallet set that all Harambee user wallets
// belong to. Run once, then save the printed ID into .env.local.
async function main() {
  const client = createCircleClient();
  const response = await client.createWalletSet({ name: "Harambee" });

  console.log("Wallet set created.");
  console.log("Add this line to .env.local:");
  console.log(`CIRCLE_WALLET_SET_ID=${response.data?.walletSet?.id}`);
}

main().catch((err) => {
  console.error("create-wallet-set failed:", err);
  process.exit(1);
});
