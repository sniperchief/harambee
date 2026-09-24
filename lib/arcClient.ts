import { createPublicClient, http } from "viem";
import { ARC_PUBLIC_RPC_URL, arcMainnet } from "./network";

// Server-side read client for Arc mainnet. ARC_RPC_URL lets production use a
// dedicated RPC provider; it falls back to the public endpoint.
export function createArcPublicClient(timeout = 10_000) {
  return createPublicClient({
    chain: arcMainnet,
    transport: http(process.env.ARC_RPC_URL || ARC_PUBLIC_RPC_URL, { timeout }),
  });
}
