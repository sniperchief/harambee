import Image from "next/image";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("harambee_session")?.value;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/harambee-favicon.png"
          alt="Harambee"
          width={72}
          height={72}
          className="rounded-2xl"
          priority
        />
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Harambee
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Group-pooling payments on Arc.
        </p>
        <div className="mt-2 flex gap-3">
          <a
            href="/pools/new"
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Create a pool
          </a>
          <a
            href={isLoggedIn ? "/account" : "/register"}
            className="rounded border border-zinc-300 px-4 py-2 text-black dark:border-zinc-700 dark:text-zinc-50"
          >
            {isLoggedIn ? "My account" : "Register"}
          </a>
        </div>
      </main>
    </div>
  );
}
