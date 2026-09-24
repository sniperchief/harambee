import { defineChain } from "viem";

// Single source of truth for which network Harambee runs on: Arc mainnet.
// Safe to import from both server and client code — nothing secret here.
// Every on-chain call (viem, Circle Wallets, Circle Contracts, Circle
// Modular Wallets) takes its chain identifier from this file, so there is
// exactly one place that decides the network.

export const ARC_CHAIN_ID = 5042;

// Public Arc mainnet RPC. The server can point at a dedicated provider via
// ARC_RPC_URL (see lib/arcClient.ts); this is the default and the one
// browsers use.
export const ARC_PUBLIC_RPC_URL = "https://rpc.mainnet.arc.io";

export const ARC_EXPLORER_URL =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://explorer.arc.io";

export const arcMainnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc",
  // Arc's native currency is USDC. At the protocol level it has 18 decimals,
  // which is why amounts go through parseEther/formatEther.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_PUBLIC_RPC_URL] } },
  blockExplorers: { default: { name: "Arc Explorer", url: ARC_EXPLORER_URL } },
});

// Circle Developer-Controlled Wallets / Smart Contract Platform identifier.
export const CIRCLE_BLOCKCHAIN = "ARC" as const;

// Path segment Circle's Modular Wallets RPC uses for this chain
// (`${NEXT_PUBLIC_CIRCLE_CLIENT_URL}/${CIRCLE_MODULAR_CHAIN}`).
export const CIRCLE_MODULAR_CHAIN = "arc";

// USDC's ERC-20 interface on Arc mainnet (6 decimals). Harambee moves USDC as
// Arc's native currency, so the app never calls this contract; it's recorded
// here so deploy checks can confirm the network (see scripts/check-mainnet.ts).
export const ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
