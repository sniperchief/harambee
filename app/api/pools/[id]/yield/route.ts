import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getPoolYieldUsdc } from "@/lib/yieldVault";

// GET /api/pools/[id]/yield -> { yield: string | null }
// Live yield earned so far for one pool. Read client-side so the pool page
// renders instantly and the figure fills in.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: pool } = await supabase
    .from("pools")
    .select("onchain_pool_id, current_amount")
    .eq("id", id)
    .single();

  if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

  const yieldEarned = await getPoolYieldUsdc(pool.onchain_pool_id, pool.current_amount);
  return NextResponse.json({ yield: yieldEarned });
}
