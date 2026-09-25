import { Logo } from "@/components/Logo";
import { SurfaceCard } from "@/components/design/Card";

/**
 * Split-screen auth. Left: a quiet ink brand panel (logo, one Champ line) so
 * the eye goes to the form. Right: the cream canvas with a mono eyebrow, Champ
 * title, lead, and the actions in a Surface Card.
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

        <h2 className="type-display max-w-[480px]">Pool together. Give together.</h2>

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
