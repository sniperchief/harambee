import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";
import { CIRCLE_BLOCKCHAIN } from "../lib/network";

// One-time setup: creates the platform wallet on Arc mainnet — the
// Developer-Controlled wallet the server uses to submit createPool and
// checkAndRelease (and to deploy the escrow). It needs a small USDC balance
// for gas unless a Gas Station policy covers it.
//
// Usage: npm run circle:create-platform-wallet [-- SCA|EOA]   (default SCA)
async function main() {
  const accountType = (process.argv[2] ?? "SCA").toUpperCase();
  if (accountType !== "SCA" && accountType !== "EOA") {
    throw new Error("accountType must be SCA or EOA");
  }

  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!walletSetId) {
    throw new Error("Missing CIRCLE_WALLET_SET_ID in .env.local");
  }

  const response = await createCircleClient().createWallets({
    walletSetId,
    blockchains: [CIRCLE_BLOCKCHAIN],
    count: 1,
    accountType,
  });

  const wallet = response.data?.wallets?.[0];
  if (!wallet) throw new Error("Wallet creation returned no wallet");

  console.log("Platform wallet created:", { id: wallet.id, address: wallet.address, accountType });
  console.log("Set this in the environment:");
  console.log(`HARAMBEE_PLATFORM_WALLET_ID=${wallet.id}`);
  console.log(`Then send a small amount of USDC on Arc to ${wallet.address} to cover gas.`);
}

main().catch((err) => {
  console.error("create-platform-wallet failed:", err);
  process.exit(1);
});
