import { isResolvable, readOnchainPool } from "./poolEscrow";
import { checkAndReleasePool, finalize } from "./poolRelease";

// Shared by the sync, contribute-confirm and cron routes: re-reads a pool's
// on-chain state, syncs Supabase from it, and triggers release/refund if the
// pool's rules now allow it (even if a previous call already released or
// refunded it on-chain but Supabase hasn't caught up yet).
export async function syncPoolFromChain(poolId: string, onchainPoolId: string, targetCurrency: string | null) {
  const state = await readOnchainPool(onchainPoolId);

  if (isResolvable(state)) {
    return checkAndReleasePool(poolId, onchainPoolId, targetCurrency);
  }

  return finalize(poolId, targetCurrency, state);
}
