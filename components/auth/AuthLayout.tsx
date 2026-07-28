import { Logo } from "@/components/Logo";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF7F50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Split-screen auth: reassuring brand panel + focused form. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between bg-navy px-12 py-12 lg:flex lg:w-[46%] xl:w-2/5">
        <Logo href="/" size={32} tone="light" />
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            The trusted way to pool money toward a shared goal.
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              "Your funds sit in audited escrow — never a personal wallet.",
              "Sign in with the passkey on your device. No passwords, no seed phrases.",
              "Full refunds if a goal isn't reached. No one can withdraw early.",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-white/80">
                <Check /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/50">Built on Circle Arc · Settled in USDC</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="lg:hidden">
          <Logo href="/" size={30} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[380px] animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
