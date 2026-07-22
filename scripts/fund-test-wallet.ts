import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";

// One-time setup for Step 5: requests testnet USDC from Circle's faucet for
// a given Arc testnet wallet address. Usage:
//   npm run circle:fund-test-wallet -- 0xYourWalletAddress
async function main() {
  const address = process.argv[2];
  if (!address) {
    throw new Error("Usage: npm run circle:fund-test-wallet -- <address>");
  }

  const client = createCircleClient();
  await client.requestTestnetTokens({
    address,
    blockchain: "ARC-TESTNET",
    usdc: true,
    native: true,
  });

  console.log(`Faucet request sent for ${address}. Funds usually arrive within a minute or two.`);
}

main().catch((err) => {
  console.error("fund-test-wallet failed:", err);
  process.exit(1);
});
