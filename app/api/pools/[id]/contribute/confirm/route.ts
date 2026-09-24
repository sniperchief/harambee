import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { getVerifiedContributionWei } from "@/lib/poolEscrow";
import { syncPoolFromChain } from "@/lib/poolSync";
import { getSessionUser } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";

// Called by the browser right after a passkey-signed contribute() succeeds
// on-chain. Nothing from the client is trusted as-is: the transaction is
// looked up on Arc and must contain a Contributed event from our escrow, for
// this pool, from the logged-in user's wallet. The amount recorded is the
// on-chain amount. Then the pool's aggregate state is re-synced from the
// contract.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params;
  const { txHash } = await request.json();

  if (!txHash || typeof txHash !== "string") {
    return NextResponse.json({ error: "txHash is required" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!user.modular_wallet_address) {
    return NextResponse.json({ error: "Your account has no wallet" }, { status: 400 });
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

  let amountWei: bigint;
  try {
    amountWei = await getVerifiedContributionWei(txHash, pool.onchain_pool_id, user.modular_wallet_address);
  } catch (err) {
    console.error("Contribution verification failed:", err);
    return NextResponse.json(
      { error: "We couldn't confirm this contribution on-chain." },
      { status: 400 }
    );
  }

  const { error: contributionError } = await supabase.from("pool_contributions").insert({
    pool_id: poolId,
    contributor_id: user.id,
    amount: formatEther(amountWei),
    tx_hash: txHash.toLowerCase(),
    status: "confirmed",
  });

  // 23505 = this transaction is already recorded (e.g. a retried request).
  // The contribution exists either way, so carry on and return pool state.
  if (contributionError && contributionError.code !== "23505") {
    return NextResponse.json({ error: contributionError.message }, { status: 500 });
  }

  // The contribution is already on-chain and recorded. Re-syncing the pool's
  // aggregate state (and possibly triggering release) is best-effort: a
  // transient chain/RPC hiccup here must not surface as a failure for a
  // contribution that already succeeded. Fall back to current DB state so the
  // client always receives valid JSON.
  try {
    const result = await syncPoolFromChain(poolId, pool.onchain_pool_id, pool.target_currency);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Post-contribution sync failed (contribution already recorded):", err);
    const { data: fresh } = await supabase
      .from("pools")
      .select("current_amount, status")
      .eq("id", poolId)
      .single();
    return NextResponse.json({
      currentAmount: fresh?.current_amount ?? pool.current_amount,
      status: fresh?.status ?? pool.status,
    });
  }
}
