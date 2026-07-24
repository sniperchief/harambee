// Browser-only, like lib/modularWallet.ts (WebAuthn requires a real window).
// Where modularWallet.ts stops at deriving a wallet *address* for
// auth/display, this derives the same Circle smart account but keeps it as
// a signable object, so it can actually submit a sponsored on-chain
// transaction — the piece the auth flow never needed.
import { createPublicClient, encodeFunctionData, parseEther, type Address } from "viem";
import { arcTestnet } from "viem/chains";
import { toWebAuthnAccount, createBundlerClient } from "viem/account-abstraction";
import {
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
  toCircleSmartAccount,
  WebAuthnMode,
} from "@circle-fin/modular-wallets-core";

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
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY!;
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL!;

  const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
  const modularTransport = toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: modularTransport });

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
    chain: arcTestnet,
    transport: modularTransport,
    paymaster: true,
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
