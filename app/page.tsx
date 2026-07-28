import Link from "next/link";
import { cookies } from "next/headers";
import { Gem, GraduationCap, HandHeart, Building2, Handshake, Globe } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { ButtonLink } from "@/components/ui/Button";
import { TypingText } from "@/components/TypingText";

const USE_CASES = [
  { Icon: Gem, title: "Weddings", body: "Collect from family and friends toward the celebration." },
  { Icon: GraduationCap, title: "School fees", body: "Rally a community to keep a student in class." },
  { Icon: HandHeart, title: "Family support", body: "Come together quickly when someone needs help." },
  { Icon: Building2, title: "Community projects", body: "Fund the borehole, the clinic, the church roof." },
  { Icon: Handshake, title: "Cooperatives", body: "Run a transparent savings circle with clear rules." },
  { Icon: Globe, title: "Diaspora giving", body: "Send home together, with everyone able to see the total." },
];

const STEPS = [
  {
    n: "1",
    title: "Create a pool",
    body: "Name your goal, set a target and a deadline. It takes about a minute — no bank forms, no crypto jargon.",
  },
  {
    n: "2",
    title: "Invite contributors",
    body: "Share one link. Anyone can chip in with a passkey — no app to download, no seed phrases to write down.",
  },
  {
    n: "3",
    title: "Reach the goal, funds release",
    body: "Money is held safely in escrow and earns yield while it waits. Hit the target and it releases automatically.",
  },
];

const FAQ = [
  {
    q: "Where is my money held?",
    a: "Every contribution goes into an audited smart-contract escrow — not a personal account. Funds can only move to the recipient when the goal is met, or back to contributors if it isn't. No single person can withdraw early.",
  },
  {
    q: "Do I need to understand crypto?",
    a: "No. You sign in with a passkey — the same Face ID or fingerprint you already use. Balances are shown in plain dollars. The blockchain is just the plumbing; you never touch it.",
  },
  {
    q: "What happens if we don't reach the goal?",
    a: "If the deadline passes without hitting the target, every contributor can claim a full refund from escrow. Nobody loses their money.",
  },
  {
    q: "How does the pool earn yield?",
    a: "While funds wait in escrow, they sit in a low-risk yield vault. Any yield earned is added to the pool — so waiting works in your favour.",
  },
  {
    q: "Are there gas fees?",
    a: "No. Transactions are gasless — Harambee sponsors the network fees, so contributors pay exactly what they intend to give.",
  },
];

export default async function Home() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("harambee_session")?.value;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader isLoggedIn={isLoggedIn} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-20">
            <div className="animate-fade-in">
              <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-navy sm:text-[56px]">
                Pool together.
                <br />
                Grow together.
                <br />
                <TypingText
                  words={["Achieve together.", "Celebrate together."]}
                  className="text-brand"
                />
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Harambee is the calm, trustworthy way for groups to collect money toward a shared goal — held safely in escrow, growing while it waits.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={isLoggedIn ? "/pools/new" : "/register"} size="lg" variant="coral">
                  Start a pool
                </ButtonLink>
                <ButtonLink href="#how" size="lg" variant="secondary">
                  See how it works
                </ButtonLink>
              </div>
            </div>

            <div className="animate-scale-in lg:pl-8">
              <HeroMockup />
            </div>
          </div>
        </section>

        {/* How it works — navy */}
        <section id="how" className="scroll-mt-20 bg-navy">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand">How it works</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Three steps, about a minute
              </h2>
              <p className="mt-3 text-lg text-white/70">
                As simple as sending a transfer. The complicated parts happen quietly in the background.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-[18px] border border-line bg-white p-6 shadow-lg">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-base font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases — white */}
        <section id="use-cases" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand-600">Use cases</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                Whatever you&apos;re raising for
              </h2>
              <p className="mt-3 text-lg text-muted">
                Harambee means &ldquo;all pull together.&rdquo; From weddings to school fees to keeping a
                cooperative honest — one place to gather funds transparently.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASES.map((u) => (
                <div
                  key={u.title}
                  className="group rounded-[18px] bg-brand-strong p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/15 text-white transition-colors group-hover:bg-navy/10 group-hover:text-navy">
                    <u.Icon size={24} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-navy">{u.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/90 group-hover:text-navy/75">{u.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — navy */}
        <section id="faq" className="scroll-mt-20 bg-navy">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-brand">FAQ</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Questions people ask first
              </h2>
            </div>
            <div className="mt-10 divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[16px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition-transform group-open:rotate-45">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                  <p className="pb-5 pr-10 text-[15px] leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — white section, navy card */}
        <section className="px-4 pb-20 pt-20 sm:px-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-navy px-6 py-16 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start pooling toward what matters
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Create your first pool in about a minute. No downloads, no gas fees, no jargon.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href={isLoggedIn ? "/pools/new" : "/register"}
                className="inline-flex h-13 min-h-[52px] items-center rounded-none bg-brand-strong px-7 text-base font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:brightness-95 hover:shadow-lg"
              >
                Start a pool
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
