// Browser-only, like lib/modularWallet.ts (WebAuthn requires a real window).
// Where modularWallet.ts stops at deriving a wallet *address* for
// auth/display, this derives the same Circle smart account but keeps it as
// a signable object, so it can actually submit a sponsored on-chain
// transaction — the piece the auth flow never needed.
import { encodeFunctionData, parseEther, type Address } from "viem";
import { toWebAuthnAccount, createBundlerClient } from "viem/account-abstraction";
import {
  toWebAuthnCredential,
  toCircleSmartAccount,
  getUserOperationGasPrice,
  WebAuthnMode,
} from "@circle-fin/modular-wallets-core";
import { getModularClients } from "./modularWalletConfig";
import { arcMainnet } from "./network";

// Only the one function being called is needed to encode calldata — no
// reason to ship the full PoolEscrow ABI (loaded server-side via fs) to the
// browser just for this.
const CONTRIBUTE_ABI = [
  {
    type: "function",
    name: "contribute",
    stateMutability: "payable",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
  },
] as const;

const REFUND_ABI = [
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
  },
] as const;

async function getBundlerClient() {
  const { passkeyTransport, modularTransport, publicClient } = getModularClients();

  // Re-authenticate via the passkey each time: this is what actually
  // authorizes spending from this specific smart account.
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login,
  });
  const owner = toWebAuthnAccount({ credential, rpId: credential.rpId });
  const account = await toCircleSmartAccount({ client: publicClient, owner });

  // The same modular transport doubles as both bundler and paymaster
  // (Circle Gas Station) endpoint — `paymaster: true` is what sponsors gas.
  const bundlerClient = createBundlerClient({
    account,
    chain: arcMainnet,
    transport: modularTransport,
    paymaster: true,
    // viem's default fee estimate underprices maxPriorityFeePerGas on Arc,
    // tripping the bundler precheck ("maxPriorityFeePerGas ... must be at
    // least ..."). Use Circle's own gas-price oracle so the fees always
    // satisfy the bundler, with a 1 gwei floor as belt-and-suspenders.
    userOperation: {
      estimateFeesPerGas: async () => {
        const { medium } = await getUserOperationGasPrice(publicClient);
        const floor = 1_000_000_000n; // 1 gwei
        let maxPriorityFeePerGas = BigInt(medium.maxPriorityFeePerGas);
        if (maxPriorityFeePerGas < floor) maxPriorityFeePerGas = floor;
        let maxFeePerGas = BigInt(medium.maxFeePerGas);
        if (maxFeePerGas < maxPriorityFeePerGas) maxFeePerGas = maxPriorityFeePerGas;
        return { maxFeePerGas, maxPriorityFeePerGas };
      },
    },
  });

  return { bundlerClient, account };
}

async function submitPoolCall(
  poolEscrowAddress: Address,
  abi: typeof CONTRIBUTE_ABI | typeof REFUND_ABI,
  functionName: "contribute" | "refund",
  poolId: string,
  value: bigint
) {
  const { bundlerClient, account } = await getBundlerClient();

  const hash = await bundlerClient.sendUserOperation({
    calls: [
      {
        to: poolEscrowAddress,
        value,
        data: encodeFunctionData({ abi, functionName, args: [BigInt(poolId)] }),
      },
    ],
  });

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
  // A user operation can be included on-chain while its inner call reverted
  // (e.g. the pool closed a moment earlier). That's a failed contribution or
  // refund, not a success — no money moved.
  if (!receipt.success) {
    throw new Error(`Transaction reverted: ${receipt.reason ?? "the pool rejected it"}`);
  }
  return { txHash: receipt.receipt.transactionHash, address: account.address };
}

export async function contributeWithPasskey(
  poolEscrowAddress: Address,
  poolId: string,
  amountUsdc: string
) {
  return submitPoolCall(
    poolEscrowAddress,
    CONTRIBUTE_ABI,
    "contribute",
    poolId,
    parseEther(amountUsdc)
  );
}

export async function refundWithPasskey(poolEscrowAddress: Address, poolId: string) {
  return submitPoolCall(poolEscrowAddress, REFUND_ABI, "refund", poolId, 0n);
}
