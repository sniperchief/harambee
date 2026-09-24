import { config } from "dotenv";
config({ path: ".env.local" });

import { formatEther } from "viem";
import { createServiceClient } from "../lib/supabase";
import { readOnchainPool } from "../lib/poolEscrow";

async function main() {
  const supabase = createServiceClient();
  const { data: pools, error } = await supabase
    .from("pools")
    .select("id, title, status, deadline, target_amount, current_amount, onchain_pool_id, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = pools ?? [];

  console.log(`\n${rows.length} pools in DB\n`);

  // Duplicate onchain_pool_id detection — the smoking gun for the ID-collision bug.
  const byOnchain = new Map<string, typeof rows>();
  for (const p of rows) {
    const k = String(p.onchain_pool_id);
    (byOnchain.get(k) ?? byOnchain.set(k, []).get(k)!).push(p);
  }
  const dups = [...byOnchain.entries()].filter(([, arr]) => arr.length > 1);
  if (dups.length) {
    console.log("DUPLICATE onchain_pool_id — multiple DB pools share ONE on-chain pool:");
    for (const [k, arr] of dups) console.log(`   on-chain #${k}: ` + arr.map((p) => `"${p.title}"`).join("  +  "));
    console.log("");
  } else {
    console.log("No duplicate onchain_pool_id values.\n");
  }

  for (const p of rows) {
    const dbDeadline = new Date(p.deadline).toISOString();
    try {
      const chain = await readOnchainPool(String(p.onchain_pool_id));
      const exists = chain.exists;
      const chainStatus = exists ? chain.status : "DOES-NOT-EXIST";
      const chainDeadline = exists ? new Date(chain.deadline * 1000).toISOString() : "—";
      const mismatch = exists && chainDeadline !== dbDeadline ? "  <-- DEADLINE MISMATCH" : "";
      console.log(`on-chain #${p.onchain_pool_id}  "${p.title}"`);
      console.log(`   DB:    status=${p.status}  current=${p.current_amount}  target=${p.target_amount}  deadline=${dbDeadline}`);
      console.log(
        `   CHAIN: status=${chainStatus}  current=${exists ? chain.currentAmount : "—"}  target=${exists ? formatEther(chain.targetAmountWei) : "—"}  deadline=${chainDeadline}${mismatch}`
      );
      console.log("");
    } catch (e) {
      console.log(`on-chain #${p.onchain_pool_id}  "${p.title}"  — chain query failed: ${(e as Error).message}\n`);
    }
  }
}

main().catch((err) => {
  console.error("diagnose failed:", err);
  process.exit(1);
});
