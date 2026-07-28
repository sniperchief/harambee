import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePoolForm } from "@/components/CreatePoolForm";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/session";

export default async function NewPoolPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/pools/new");

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center px-4 py-10 sm:py-14">
        <Logo href="/dashboard" size={30} className="mb-7" />

        <div className="relative w-full max-w-[460px] rounded-[22px] border border-line bg-surface p-6 shadow-[0_28px_64px_-24px_rgba(15,39,71,0.28)] sm:p-7">
          <Link
            href="/dashboard"
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Link>

          <CreatePoolForm />
        </div>
      </main>
    </div>
  );
}
