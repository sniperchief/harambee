import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

export function createCircleContractsClient() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error(
      "Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env.local"
    );
  }

  return initiateSmartContractPlatformClient({ apiKey, entitySecret });
}
