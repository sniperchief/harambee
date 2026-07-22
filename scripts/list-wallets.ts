import { config } from "dotenv";
config({ path: ".env.local" });

import { createCircleClient } from "../lib/circle";

async function main() {
  const client = createCircleClient();
  const response = await client.listWallets({
    walletSetId: process.env.CIRCLE_WALLET_SET_ID,
  });

  for (const wallet of response.data?.wallets ?? []) {
    console.log({ id: wallet.id, address: wallet.address, accountType: wallet.accountType });
  }
}

main().catch((err) => {
  console.error("list-wallets failed:", err);
  process.exit(1);
});
