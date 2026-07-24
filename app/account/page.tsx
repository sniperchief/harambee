import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("harambee_session")?.value;

  if (!userId) {
    redirect("/login");
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select()
    .eq("id", userId)
    .single();

  if (!user) {
    redirect("/login");
  }

  const { data: createdPools } = await supabase
    .from("pools")
    .select()
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  const { data: contributions } = (await supabase
    .from("pool_contributions")
    .select("pool_id, pools(id, title, status)")
    .eq("contributor_id", userId)) as unknown as {
    data: { pool_id: string; pools: { id: string; title: string; status: string } | null }[] | null;
  };

  const createdIds = new Set((createdPools ?? []).map((p) => p.id));
  const contributedPools = Array.from(
    new Map(
      (contributions ?? [])
        .map((c) => c.pools)
        .filter((p) => !!p && !createdIds.has(p.id))
        .map((p) => [p!.id, p!])
    ).values()
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        You&apos;re logged in
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Modular wallet address:
      </p>
      <code className="rounded bg-zinc-200 px-3 py-2 text-black dark:bg-zinc-800 dark:text-zinc-50">
        {user.modular_wallet_address}
      </code>
      <a
        href="https://faucet-v2.circle.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-zinc-500 underline"
      >
        Get testnet funds
      </a>

      <a
        href="/pools/new"
        className="mt-2 rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        Create a pool
      </a>

      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">My pools</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {(createdPools ?? []).map((pool) => (
            <li key={pool.id}>
              <a href={`/pools/${pool.id}`} className="underline">
                {pool.title}
              </a>{" "}
              <span className="text-xs text-zinc-500">(created, {pool.status})</span>
            </li>
          ))}
          {contributedPools.map((pool) => (
            <li key={pool.id}>
              <a href={`/pools/${pool.id}`} className="underline">
                {pool.title}
              </a>{" "}
              <span className="text-xs text-zinc-500">(contributed, {pool.status})</span>
            </li>
          ))}
          {(createdPools ?? []).length === 0 && contributedPools.length === 0 && (
            <li className="text-sm text-zinc-500">No pools yet.</li>
          )}
        </ul>
      </div>

      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="mt-4 rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:text-zinc-50"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
