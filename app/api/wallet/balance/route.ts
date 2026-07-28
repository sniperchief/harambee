import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getWalletBalanceUsdc } from "@/lib/walletBalance";

// GET /api/wallet/balance -> { balance: string | null }
// The logged-in user's spendable USDC balance. Fetched client-side so pages
// render instantly and the number fills in when the chain read returns.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const balance = await getWalletBalanceUsdc(user.modular_wallet_address);
  return NextResponse.json({ balance, address: user.modular_wallet_address });
}
