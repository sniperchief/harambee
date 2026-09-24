import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";
import { getCircleCredentials } from "./circle";

export function createCircleContractsClient() {
  return initiateSmartContractPlatformClient(getCircleCredentials());
}
