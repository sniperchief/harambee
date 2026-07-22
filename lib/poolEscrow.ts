import * as fs from "fs";
import * as path from "path";

let cachedAbiJson: string | undefined;

export function getPoolEscrowAbiJson(): string {
  if (!cachedAbiJson) {
    const artifactPath = path.join(process.cwd(), "contracts/artifacts/PoolEscrow.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    cachedAbiJson = JSON.stringify(artifact.abi);
  }
  return cachedAbiJson;
}

export function getPoolEscrowAddress(): string {
  const address = process.env.POOL_ESCROW_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Missing POOL_ESCROW_CONTRACT_ADDRESS in .env.local");
  }
  return address;
}
