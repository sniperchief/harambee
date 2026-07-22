import { NextRequest, NextResponse } from "next/server";
import { checkAndReleasePool } from "@/lib/poolRelease";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params;
  const { walletId } = await request.json();

  if (!walletId) {
    return NextResponse.json({ error: "walletId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: pool, error } = await supabase
    .from("pools")
    .select()
    .eq("id", poolId)
    .single();

  if (error || !pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const result = await checkAndReleasePool(poolId, pool.onchain_pool_id, walletId);
  return NextResponse.json(result);
}
