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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        You&apos;re logged in
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Modular wallet address:
      </p>
      <code className="rounded bg-zinc-200 px-3 py-2 text-black dark:bg-zinc-800 dark:text-zinc-50">
        {user.modular_wallet_address}
      </code>
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
