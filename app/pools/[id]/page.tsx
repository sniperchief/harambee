import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PoolDetail, type Contribution } from "@/components/PoolDetail";
import { Logo } from "@/components/Logo";
import { getPoolEscrowAddress } from "@/lib/poolEscrow";
import { getOnchainContribution } from "@/lib/onchainContribution";
import { createServiceClient } from "@/lib/supabase";

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: pool } = await supabase.from("pools").select().eq("id", id).single();
  if (!pool) notFound();

  const cookieStore = await cookies();
  const userId = cookieStore.get("harambee_session")?.value;

  let viewerWalletAddress: string | null = null;
  const isLoggedIn = !!userId;
  if (userId) {
    const { data: user } = await supabase
      .from("users")
      .select("modular_wallet_address")
      .eq("id", userId)
      .single();
    viewerWalletAddress = user?.modular_wallet_address ?? null;
  }

  const { data: contribRaw } = (await supabase
    .from("pool_contributions")
    .select("id, amount, created_at, status, tx_hash, users(modular_wallet_address)")
    .eq("pool_id", id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })) as unknown as {
    data:
      | {
          id: string;
          amount: string;
          created_at: string;
          status: string;
          tx_hash: string | null;
          users: { modular_wallet_address: string | null } | null;
        }[]
      | null;
  };

  const contributions: Contribution[] = (contribRaw ?? []).map((c) => ({
    id: c.id,
    amount: c.amount,
    created_at: c.created_at,
    tx_hash: c.tx_hash,
    contributor: c.users?.modular_wallet_address ?? null,
  }));

  const contributorCount = new Set(
    contributions.map((c) => c.contributor ?? c.id)
  ).size;

  // Refund gating: only people who actually contributed see the claim button,
  // and it's disabled once they've claimed (on-chain balance zeroed). Only
  // relevant for refunded pools.
  let viewerContributed = false;
  let viewerClaimed = false;
  if (viewerWalletAddress && pool.status === "refunded") {
    viewerContributed = contributions.some((c) => c.contributor === viewerWalletAddress);
    if (viewerContributed) {
      const remaining = await getOnchainContribution(pool.onchain_pool_id, viewerWalletAddress);
      viewerClaimed = remaining !== null && remaining === 0n;
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo href={isLoggedIn ? "/dashboard" : "/"} size={30} />
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-sm font-semibold text-ink hover:text-brand">Dashboard</Link>
          ) : (
            <Link href="/login" className="inline-flex h-9 items-center rounded-none bg-navy px-4 text-sm font-semibold text-white shadow-md hover:bg-[#12365f] hover:shadow-lg">Sign in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <PoolDetail
          pool={pool}
          poolEscrowAddress={getPoolEscrowAddress() as `0x${string}`}
          isLoggedIn={isLoggedIn}
          viewerWalletAddress={viewerWalletAddress}
          contributions={contributions}
          contributorCount={contributorCount}
          viewerContributed={viewerContributed}
          viewerClaimed={viewerClaimed}
        />
      </main>
    </div>
  );
}
