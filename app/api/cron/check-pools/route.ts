import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isResolvable, readOnchainPool } from "@/lib/poolEscrow";
import { checkAndReleasePool } from "@/lib/poolRelease";
import { createServiceClient } from "@/lib/supabase";

// Poll trigger: a scheduler (e.g. Vercel Cron) hits this on an interval so
// deadline-based outcomes fire even if nobody opens the pool page. Chosen
// over an event-driven trigger (an on-chain log subscription, or a Circle
// webhook) — polling is stateless and idempotent (a no-op when nothing's
// changed), and doesn't need a long-lived connection, both awkward fits for
// a serverless deployment.
//
// It spends platform-wallet gas, so it requires `Authorization: Bearer
// <CRON_SECRET>` — the header Vercel Cron sends automatically.
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function checkPools(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: openPools, error } = await supabase
    .from("pools")
    .select("id, onchain_pool_id, target_currency")
    .eq("status", "open");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  let failed = 0;
  for (const pool of openPools ?? []) {
    try {
      const state = await readOnchainPool(pool.onchain_pool_id);
      if (state.status !== "open" || isResolvable(state)) {
        const result = await checkAndReleasePool(pool.id, pool.onchain_pool_id, pool.target_currency);
        results.push({ poolId: pool.id, ...result });
      }
    } catch (err) {
      // One bad pool must not stop the rest from resolving.
      failed++;
      console.error(`Cron check failed for pool ${pool.id}:`, err);
    }
  }

  return NextResponse.json({
    checked: openPools?.length ?? 0,
    triggered: results.length,
    failed,
    results,
  });
}

export const GET = checkPools;
export const POST = checkPools;
