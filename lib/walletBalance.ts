import { formatEther } from "viem";
import { createArcPublicClient } from "./arcClient";

// On Arc the native currency IS USDC (18-decimal native value, same units the
// escrow uses with parseEther/formatEther). So a wallet's spendable USDC is
// just its native balance. Server-only. Returns a decimal string, or null if
// the read fails — callers show "—" rather than an error.
export async function getWalletBalanceUsdc(address: string | null | undefined): Promise<string | null> {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
  try {
    const wei = await createArcPublicClient(6000).getBalance({ address: address as `0x${string}` });
    return formatEther(wei);
  } catch (err) {
    console.error("Wallet balance read failed:", err);
    return null;
  }
}
