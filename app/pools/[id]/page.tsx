import { notFound } from "next/navigation";
import { PoolDetail, type Contribution } from "@/components/PoolDetail";
import { Logo } from "@/components/Logo";
import { NavigationBar } from "@/components/design/NavigationBar";
import { PillLink } from "@/components/design/PillButton";
import { Section } from "@/components/design/Section";
import { getPoolEscrowAddress } from "@/lib/poolEscrow";
import { getOnchainContribution } from "@/lib/onchainContribution";
import { getSessionUser, displayName } from "@/lib/session";
import { TopNav } from "@/components/TopNav";
import { createServiceClient } from "@/lib/supabase";

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createServiceClient();
  // Only the fields the page shows — this object is sent to the browser.
  const { data: pool } = await supabase
    .from("pools")
    .select(
      "id, title, description, target_amount, current_amount, deadline, status, onchain_pool_id, target_currency, local_currency_amount, fx_rate, recipient_wallet_address, release_tx_hash, created_at"
    )
    .eq("id", id)
    .single();
  if (!pool) notFound();

  const viewer = await getSessionUser();
  const isLoggedIn = !!viewer;
  const viewerWalletAddress: string | null = viewer?.modular_wallet_address ?? null;

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

  // Signed-in viewers get the app nav; visitors get a bare bar with Sign in.
  // Either way the page's one Marigold is "Contribute".
  return (
    <div className="min-h-screen">
      {viewer ? (
        <TopNav walletAddress={viewer.modular_wallet_address} name={displayName(viewer)} />
      ) : (
        <NavigationBar
          brand={<Logo href="/" />}
          links={[]}
          actions={
            <PillLink href={`/login?next=/pools/${id}`} variant="outlined" compact>
              Sign in
            </PillLink>
          }
        />
      )}

      <main>
        <Section className="!pt-14">
          <PoolDetail
            pool={pool}
            poolEscrowAddress={getPoolEscrowAddress()}
            isLoggedIn={isLoggedIn}
            viewerWalletAddress={viewerWalletAddress}
            contributions={contributions}
            contributorCount={contributorCount}
            viewerContributed={viewerContributed}
            viewerClaimed={viewerClaimed}
          />
        </Section>
      </main>
    </div>
  );
}
