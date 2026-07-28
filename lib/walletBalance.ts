import { createPublicClient, http, formatEther } from "viem";
import { arcTestnet } from "viem/chains";

// On Arc the native currency IS USDC (18-decimal native value, same units the
// escrow uses with parseEther/formatEther). So a wallet's spendable USDC is
// just its native balance. Server-only. Returns a decimal string, or null if
// the read fails — callers show "—" rather than an error.
export async function getWalletBalanceUsdc(address: string | null | undefined): Promise<string | null> {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
  try {
    const client = createPublicClient({
      chain: arcTestnet,
      transport: http(process.env.ARC_TESTNET_RPC_URL, { timeout: 6000 }),
    });
    const wei = await client.getBalance({ address: address as `0x${string}` });
    return formatEther(wei);
  } catch (err) {
    console.error("Wallet balance read failed:", err);
    return null;
  }
}
