import { config } from "dotenv";
config({ path: ".env.local" });

import { readOnchainPool } from "../lib/poolEscrow";

// Read-only smoke test: reads getPool(<id>) (default 0) from the configured
// escrow on Arc mainnet. On a fresh deployment, expect zeroed-out defaults.
// Usage: npm run contracts:read-pool-escrow [-- <poolId>]
async function main() {
  const poolId = process.argv[2] ?? "0";
  console.log(`getPool(${poolId}):`, await readOnchainPool(poolId));
}

main().catch((err) => {
  console.error("read-pool-escrow failed:", err);
  process.exit(1);
});
