import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PoolDetail } from "@/components/PoolDetail";
import { getPoolEscrowAddress } from "@/lib/poolEscrow";
import { createServiceClient } from "@/lib/supabase";

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: pool } = await supabase.from("pools").select().eq("id", id).single();

  if (!pool) {
    notFound();
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("harambee_session")?.value;

  let viewerWalletAddress: string | null = null;
  let isLoggedIn = false;
  if (userId) {
    isLoggedIn = true;
    const { data: user } = await supabase
      .from("users")
      .select("modular_wallet_address")
      .eq("id", userId)
      .single();
    viewerWalletAddress = user?.modular_wallet_address ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <PoolDetail
        pool={pool}
        poolEscrowAddress={getPoolEscrowAddress() as `0x${string}`}
        isLoggedIn={isLoggedIn}
        viewerWalletAddress={viewerWalletAddress}
      />
    </div>
  );
}
