import { NextRequest, NextResponse } from "next/server";
import { createCircleContractsClient } from "@/lib/circleContracts";
import { getPoolEscrowAbiJson, getPoolEscrowAddress } from "@/lib/poolEscrow";
import { checkAndReleasePool } from "@/lib/poolRelease";
import { createServiceClient } from "@/lib/supabase";

// Poll trigger: in production, an external scheduler (e.g. Vercel Cron)
// hits this on an interval. Chosen over an event-driven trigger (an
// on-chain log subscription, or a Circle webhook) — polling is stateless
// and idempotent (a no-op when nothing's changed), and doesn't need a
// long-lived connection or a public webhook endpoint with signature
// verification, both awkward fits for a serverless deployment.
export async function POST(request: NextRequest) {
  const { walletId } = await request.json();
  if (!walletId) {
    return NextResponse.json({ error: "walletId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: openPools, error } = await supabase
    .from("pools")
    .select()
    .eq("status", "open");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const contractAddress = getPoolEscrowAddress();
  const abiJson = getPoolEscrowAbiJson();
  const contractsClient = createCircleContractsClient();

  const results = [];
  for (const pool of openPools ?? []) {
    const stateResponse = await contractsClient.queryContract({
      address: contractAddress,
      blockchain: "ARC-TESTNET",
      abiJson,
      abiFunctionSignature: "getPool(uint256)",
      abiParameters: [pool.onchain_pool_id],
    });
    const [, targetAmountWei, currentAmountWei, deadlineStr] =
      stateResponse.data?.outputValues ?? [];

    const thresholdMet = BigInt(currentAmountWei) >= BigInt(targetAmountWei);
    const deadlinePassed = Math.floor(Date.now() / 1000) >= Number(deadlineStr);

    // deadline_only pools never release early — only trigger once the
    // deadline is reached, even if the target was met sooner.
    const shouldTrigger =
      pool.release_mode === "deadline_only" ? deadlinePassed : thresholdMet || deadlinePassed;

    if (shouldTrigger) {
      const result = await checkAndReleasePool(
        pool.id,
        pool.onchain_pool_id,
        walletId,
        pool.target_currency
      );
      results.push({ poolId: pool.id, ...result });
    }
  }

  return NextResponse.json({
    checked: openPools?.length ?? 0,
    triggered: results.length,
    results,
  });
}
