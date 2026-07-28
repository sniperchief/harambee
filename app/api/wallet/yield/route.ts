import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { getPoolYieldUsdc } from "@/lib/yieldVault";

// GET /api/wallet/yield -> { yield: string | null }
// Total yield accrued across the user's currently-open pools. Read
// client-side (one vault read per open pool) so the dashboard renders
// instantly and the total fills in; failures per pool are ignored.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: pools } = await supabase
    .from("pools")
    .select("onchain_pool_id, current_amount")
    .eq("creator_id", user.id)
    .eq("status", "open");

  const open = (pools ?? []) as { onchain_pool_id: string; current_amount: string | number }[];
  const results = await Promise.all(
    open.map((p) => getPoolYieldUsdc(p.onchain_pool_id, p.current_amount))
  );

  const total = results.reduce((sum, y) => sum + (y ? Number(y) : 0), 0);
  return NextResponse.json({ yield: total.toString() });
}
