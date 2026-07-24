import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { syncPoolFromChain } from "@/lib/poolSync";
import { createServiceClient } from "@/lib/supabase";

// Called by the browser right after a passkey-signed contribute() succeeds
// on-chain. Logs the individual contribution (real contributor_id now that
// there's a logged-in user, unlike the null-contributor_id curl-testing
// path), then re-syncs the pool's aggregate state from the contract.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params;
  const { amount, txHash } = await request.json();

  if (!amount || !txHash) {
    return NextResponse.json({ error: "amount and txHash are required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const contributorId = cookieStore.get("harambee_session")?.value;
  if (!contributorId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
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

  const { error: contributionError } = await supabase.from("pool_contributions").insert({
    pool_id: poolId,
    contributor_id: contributorId,
    amount,
    tx_hash: txHash,
    status: "confirmed",
  });

  if (contributionError) {
    return NextResponse.json({ error: contributionError.message }, { status: 500 });
  }

  const result = await syncPoolFromChain(poolId, pool.onchain_pool_id, pool.target_currency);
  return NextResponse.json(result);
}
