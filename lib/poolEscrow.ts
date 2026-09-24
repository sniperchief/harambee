import * as fs from "fs";
import * as path from "path";
import { formatEther, isAddress, isAddressEqual, parseAbi, parseEventLogs, type Hash } from "viem";
import { createArcPublicClient } from "./arcClient";
import { createCircleContractsClient } from "./circleContracts";
import { CIRCLE_BLOCKCHAIN } from "./network";

// Server-only helpers for the deployed PoolEscrow contract on Arc mainnet.

let cachedAbiJson: string | undefined;

export function getPoolEscrowAbiJson(): string {
  if (!cachedAbiJson) {
    const artifactPath = path.join(process.cwd(), "contracts/artifacts/PoolEscrow.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    cachedAbiJson = JSON.stringify(artifact.abi);
  }
  return cachedAbiJson;
}

export function getPoolEscrowAddress(): `0x${string}` {
  const address = process.env.POOL_ESCROW_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Missing POOL_ESCROW_CONTRACT_ADDRESS");
  }
  if (!isAddress(address)) {
    throw new Error("POOL_ESCROW_CONTRACT_ADDRESS is not a valid address");
  }
  return address;
}

// Must match the Status and ReleaseMode enum ordering in contracts/PoolEscrow.sol.
export const STATUS_BY_INDEX = ["open", "released", "refunded"] as const;
export const RELEASE_MODE_INDEX: Record<string, number> = {
  threshold_or_deadline: 0,
  threshold_only: 1,
  deadline_only: 2,
};

export type OnchainPool = {
  exists: boolean;
  recipient: string;
  targetAmountWei: bigint;
  currentAmountWei: bigint;
  currentAmount: string; // USDC, decimal string
  deadline: number; // unix seconds
  status: (typeof STATUS_BY_INDEX)[number];
  releaseMode: number;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Reads getPool(poolId) — the contract is the source of truth for a pool's
// total and status; Supabase only mirrors it.
export async function readOnchainPool(onchainPoolId: string): Promise<OnchainPool> {
  const res = await createCircleContractsClient().queryContract({
    address: getPoolEscrowAddress(),
    blockchain: CIRCLE_BLOCKCHAIN,
    abiJson: getPoolEscrowAbiJson(),
    abiFunctionSignature: "getPool(uint256)",
    abiParameters: [onchainPoolId],
  });
  const out = res.data?.outputValues;
  if (!out || out.length < 6) {
    throw new Error(`getPool(${onchainPoolId}) returned no data`);
  }
  const [recipient, targetWei, currentWei, deadline, statusIndex, releaseMode] = out;
  const currentAmountWei = BigInt(currentWei);
  return {
    exists: !!recipient && String(recipient).toLowerCase() !== ZERO_ADDRESS,
    recipient: String(recipient),
    targetAmountWei: BigInt(targetWei),
    currentAmountWei,
    currentAmount: formatEther(currentAmountWei),
    deadline: Number(deadline),
    status: STATUS_BY_INDEX[Number(statusIndex)] ?? "open",
    releaseMode: Number(releaseMode),
  };
}

// Whether checkAndRelease would succeed right now. deadline_only never
// releases early — firing it on a met target before the deadline would just
// revert. Every other mode may resolve the moment the target is hit.
export function isResolvable(pool: OnchainPool, nowSecs = Math.floor(Date.now() / 1000)): boolean {
  if (pool.status !== "open") return false;
  const thresholdMet = pool.currentAmountWei >= pool.targetAmountWei;
  const deadlinePassed = nowSecs >= pool.deadline;
  return pool.releaseMode === RELEASE_MODE_INDEX.deadline_only ? deadlinePassed : thresholdMet || deadlinePassed;
}

const EVENTS_ABI = parseAbi([
  "event PoolCreated(uint256 indexed poolId, address indexed recipient, uint256 targetAmount, uint256 deadline)",
  "event Contributed(uint256 indexed poolId, address indexed contributor, uint256 amount)",
]);

async function getSuccessfulReceipt(txHash: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Invalid transaction hash");
  // Waits briefly rather than reading once: the RPC node can be a block
  // behind the bundler / Circle that just reported the transaction confirmed.
  const client = createArcPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash: txHash as Hash, timeout: 30_000 });
  if (receipt.status !== "success") throw new Error("Transaction failed on-chain");
  return receipt;
}

// Reads the pool id assigned by createPool from the PoolCreated event in the
// transaction's own receipt, and checks it's the pool we asked for. Guessing
// the id from nextPoolId() beforehand is unsafe: createPool is permissionless,
// so another call landing first would link our record to someone else's pool.
export async function getCreatedPoolId(
  txHash: string,
  expected: { recipient: string; targetAmountWei: bigint; deadline: number }
): Promise<string> {
  const receipt = await getSuccessfulReceipt(txHash);
  const escrow = getPoolEscrowAddress();
  const match = parseEventLogs({ abi: EVENTS_ABI, eventName: "PoolCreated", logs: receipt.logs }).find(
    (log) =>
      isAddressEqual(log.address, escrow) &&
      isAddressEqual(log.args.recipient, expected.recipient as `0x${string}`) &&
      log.args.targetAmount === expected.targetAmountWei &&
      log.args.deadline === BigInt(expected.deadline)
  );
  if (!match) throw new Error("createPool transaction has no matching PoolCreated event");
  return match.args.poolId.toString();
}

// Verifies a contribution against the chain rather than trusting the client:
// the transaction must have succeeded and emitted Contributed from our escrow,
// for this pool, from this contributor's wallet. Returns the amount actually
// contributed (in wei), summed across matching events.
export async function getVerifiedContributionWei(
  txHash: string,
  onchainPoolId: string,
  contributorAddress: string
): Promise<bigint> {
  const receipt = await getSuccessfulReceipt(txHash);
  const escrow = getPoolEscrowAddress();
  const total = parseEventLogs({ abi: EVENTS_ABI, eventName: "Contributed", logs: receipt.logs })
    .filter(
      (log) =>
        isAddressEqual(log.address, escrow) &&
        log.args.poolId === BigInt(onchainPoolId) &&
        isAddressEqual(log.args.contributor, contributorAddress as `0x${string}`)
    )
    .reduce((sum, log) => sum + log.args.amount, 0n);
  if (total === 0n) throw new Error("Transaction is not a contribution to this pool from your wallet");
  return total;
}
