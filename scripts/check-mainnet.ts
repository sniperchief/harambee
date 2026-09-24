import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { formatEther, isAddress, keccak256 } from "viem";
import { createArcPublicClient } from "../lib/arcClient";
import { createCircleClient } from "../lib/circle";
import { ARC_CHAIN_ID, ARC_USDC_ADDRESS, CIRCLE_BLOCKCHAIN } from "../lib/network";
import { readOnchainPool } from "../lib/poolEscrow";

// Read-only preflight for a mainnet deployment. Checks that every piece of
// configuration points at Arc mainnet and that nothing testnet is left over.
// Sends no transactions.   Usage: npm run check:mainnet
const results: { ok: boolean; label: string; detail?: string }[] = [];
const check = (ok: boolean, label: string, detail?: string) => results.push({ ok, label, detail });

async function main() {
  const env = process.env;

  // Keys and secrets
  check(!!env.CIRCLE_API_KEY && !env.CIRCLE_API_KEY.startsWith("TEST_"), "CIRCLE_API_KEY is a LIVE key");
  check(
    !!env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY && !env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY.startsWith("TEST_"),
    "NEXT_PUBLIC_CIRCLE_CLIENT_KEY is a LIVE key"
  );
  check((env.SESSION_SECRET ?? "").length >= 32, "SESSION_SECRET is set (32+ chars)");
  check((env.CRON_SECRET ?? "").length >= 16, "CRON_SECRET is set (16+ chars)");
  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE|PRIVATE|ENTITY|API_KEY/.test(name)) {
      check(false, `${name} looks like a secret but is exposed to the browser`);
    }
  }
  const leftover = Object.keys(env).filter((n) => /TESTNET|YIELD|VAULT/.test(n));
  check(leftover.length === 0, "No testnet/yield env vars left", leftover.join(", ") || undefined);

  // Chain
  const client = createArcPublicClient();
  const chainId = await client.getChainId();
  check(chainId === ARC_CHAIN_ID, `RPC is Arc mainnet (chain ${ARC_CHAIN_ID})`, `got ${chainId}`);

  const symbol = await client
    .readContract({
      address: ARC_USDC_ADDRESS,
      abi: [{ type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
      functionName: "symbol",
    })
    .catch(() => null);
  check(symbol === "USDC", `USDC at ${ARC_USDC_ADDRESS}`, `symbol() = ${symbol}`);

  // Escrow
  const escrow = env.POOL_ESCROW_CONTRACT_ADDRESS;
  if (!escrow || !isAddress(escrow)) {
    check(false, "POOL_ESCROW_CONTRACT_ADDRESS is a valid address");
  } else {
    const code = await client.getCode({ address: escrow });
    const artifact = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../contracts/artifacts/PoolEscrow.json"), "utf8")
    );
    check(!!code && code !== "0x", "PoolEscrow is deployed on Arc mainnet", escrow);
    // The dispatcher embeds each function's 4-byte selector, so their presence
    // confirms this address is PoolEscrow and not some other contract.
    const selectors = ["createPool(uint256,uint256,address,uint8)", "contribute(uint256)", "checkAndRelease(uint256)", "refund(uint256)", "getPool(uint256)"];
    const missing = selectors.filter(
      (sig) => !code?.includes(keccak256(new TextEncoder().encode(sig)).slice(2, 10))
    );
    check(missing.length === 0, "Deployed escrow exposes the expected functions", missing.join(", ") || undefined);
    check(
      !artifact.abi.some((f: { name?: string }) => /yield|vault/i.test(f.name ?? "")),
      "Escrow ABI has no yield/vault functions"
    );
    const deployment = path.join(__dirname, "../contracts/artifacts/PoolEscrow.deployment.json");
    if (fs.existsSync(deployment)) {
      const d = JSON.parse(fs.readFileSync(deployment, "utf8"));
      check(
        d.chainId === ARC_CHAIN_ID && String(d.contractAddress).toLowerCase() === escrow.toLowerCase(),
        "Deployment record matches configured escrow"
      );
    }
    try {
      await readOnchainPool("0");
      check(true, "Circle Contracts can read the escrow on ARC");
    } catch (err) {
      check(false, "Circle Contracts can read the escrow on ARC", (err as Error).message);
    }
  }

  // Platform wallet
  const walletId = env.HARAMBEE_PLATFORM_WALLET_ID;
  if (!walletId) {
    check(false, "HARAMBEE_PLATFORM_WALLET_ID is set");
  } else {
    try {
      const wallet = (await createCircleClient().getWallet({ id: walletId })).data?.wallet;
      check(wallet?.blockchain === CIRCLE_BLOCKCHAIN, `Platform wallet is on ${CIRCLE_BLOCKCHAIN}`, wallet?.blockchain);
      if (wallet?.address) {
        const balance = await client.getBalance({ address: wallet.address as `0x${string}` });
        check(balance > 0n, "Platform wallet has USDC for gas", `${formatEther(balance)} USDC at ${wallet.address}`);
      }
    } catch (err) {
      check(false, "Platform wallet readable via Circle", (err as Error).message);
    }
  }

  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? `  (${r.detail})` : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll mainnet checks passed.");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("check-mainnet failed:", err);
  process.exit(1);
});
