import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

// Circle API keys are prefixed with their environment (TEST_API_KEY:… or
// LIVE_API_KEY:…). A TEST key can only reach testnets, so refuse it outright
// rather than failing later with a confusing "unsupported blockchain" error.
export function getCircleCredentials() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET");
  }
  if (apiKey.startsWith("TEST_")) {
    throw new Error("CIRCLE_API_KEY is a testnet (TEST_) key — Arc mainnet needs a LIVE_ key");
  }

  return { apiKey, entitySecret };
}

export function createCircleClient() {
  return initiateDeveloperControlledWalletsClient(getCircleCredentials());
}
