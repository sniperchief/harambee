import { Logo } from "@/components/Logo";
import { SurfaceCard } from "@/components/design/Card";

const PROMISES = [
  "Your funds sit in escrow — never in anyone’s personal wallet.",
  "Sign in with the passkey on your device. No passwords, no seed phrases.",
  "Full refunds if a goal isn’t reached. No one can withdraw early.",
];

/**
 * Split-screen auth. Left: an ink brand panel (surface level 3) with a Champ
 * statement and a ruled, numbered list. Right: the cream canvas with a mono
 * eyebrow, Champ title, lead, and the actions in a Surface Card.
 */
export function AuthLayout({
  eyebrow,
  title,
  lead,
  children,
  after,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  /** Card contents — the form and its actions. */
  children: React.ReactNode;
  /** Optional content under the card (errors, fine print). */
  after?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="hidden flex-col justify-between bg-ink-black px-12 py-12 text-bone-white lg:flex lg:w-1/2">
        <Logo href="/" tone="light" />

        <div className="max-w-[480px]">
          <h2 className="type-heading-lg">The honest way to pool money toward a shared goal.</h2>
          <ol className="mt-10 border-t border-bone-white/25">
            {PROMISES.map((t, i) => (
              <li key={t} className="flex gap-8 border-b border-bone-white/25 py-6">
                <span className="font-dm-mono text-sm text-marigold">0{i + 1}</span>
                <span className="text-body">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="font-dm-mono text-sm text-bone-white/80">Built on Circle Arc · Settled in USDC</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col bg-buttercream px-4 py-8 sm:px-6 lg:w-1/2">
        <div className="lg:hidden">
          <Logo href="/" />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px] animate-fade-in">
            <p className="font-dm-mono text-sm uppercase tracking-[0.08em]">{eyebrow}</p>
            <h1 className="type-heading-lg mt-3">{title}</h1>
            <div className="mt-4 text-body text-ink-black/80">{lead}</div>
            <SurfaceCard className="mt-8">{children}</SurfaceCard>
            {after}
          </div>
        </div>
      </main>
    </div>
  );
}
