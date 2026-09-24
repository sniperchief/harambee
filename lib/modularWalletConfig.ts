import { toModularTransport, toPasskeyTransport } from "@circle-fin/modular-wallets-core";
import { createPublicClient } from "viem";
import { CIRCLE_MODULAR_CHAIN, arcMainnet } from "./network";

// Browser-only: shared Circle Modular Wallets setup for passkey auth and
// passkey-signed transactions, pinned to Arc mainnet.
export function getModularClients() {
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;
  if (!clientKey || !clientUrl) {
    throw new Error("Missing NEXT_PUBLIC_CIRCLE_CLIENT_KEY or NEXT_PUBLIC_CIRCLE_CLIENT_URL");
  }
  // Circle client keys are environment-prefixed; a TEST key only reaches testnets.
  if (clientKey.startsWith("TEST_")) {
    throw new Error("NEXT_PUBLIC_CIRCLE_CLIENT_KEY is a testnet (TEST_) key — Arc mainnet needs a LIVE_ key");
  }

  const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
  const modularTransport = toModularTransport(`${clientUrl}/${CIRCLE_MODULAR_CHAIN}`, clientKey);
  const publicClient = createPublicClient({ chain: arcMainnet, transport: modularTransport });

  return { passkeyTransport, modularTransport, publicClient };
}
