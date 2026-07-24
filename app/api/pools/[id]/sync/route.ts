import { NextRequest, NextResponse } from "next/server";
import { syncPoolFromChain } from "@/lib/poolSync";
import { createServiceClient } from "@/lib/supabase";

// Polled by the pool detail page while a pool is open — re-reads on-chain
// state and releases it if the threshold or deadline condition is now met,
// even if no new contribution triggered it (e.g. the deadline just passed).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params;

  const supabase = createServiceClient();
  const { data: pool, error } = await supabase
    .from("pools")
    .select()
    .eq("id", poolId)
    .single();

  if (error || !pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const result = await syncPoolFromChain(poolId, pool.onchain_pool_id, pool.target_currency);
  return NextResponse.json(result);
}
