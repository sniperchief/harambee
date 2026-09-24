import { getSessionUserId } from "@/lib/session";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { PullTogetherBand } from "@/components/marketing/PullTogetherBand";
import { TypingText } from "@/components/TypingText";
import { Hero } from "@/components/design/Hero";
import { Section, SectionHeader } from "@/components/design/Section";
import { FeatureGrid, type Feature } from "@/components/design/FeatureGrid";
import { PillLink } from "@/components/design/PillButton";

// Hero photography (DESIGN.md › Imagery): warm, documentary-style — linked
// hands, "all pull together". Sits under the warm dark scrim.
const HERO_IMAGE = "/hero.jpg";

const STEPS: Feature[] = [
  {
    marker: "01",
    title: "Create a pool",
    body: "Name the goal, set a target and a deadline. No bank forms, no crypto jargon.",
  },
  {
    marker: "02",
    title: "Share one link",
    body: "Anyone can chip in with a passkey — Face ID or fingerprint. Nothing to download, no seed phrase.",
  },
  {
    marker: "03",
    title: "Release or refund",
    body: "Money waits in escrow until the pool’s rules are met, then releases to the recipient — or goes back to everyone.",
  },
];

const USE_CASES = [
  { title: "Weddings", body: "Collect from family and friends toward the celebration." },
  { title: "School fees", body: "Rally a community to keep a student in class." },
  { title: "Family support", body: "Come together quickly when someone needs help." },
  { title: "Community projects", body: "Fund the borehole, the clinic, the church roof." },
  { title: "Cooperatives", body: "Run a transparent savings circle with clear rules." },
  { title: "Diaspora giving", body: "Send home together, with everyone able to see the total." },
];

const FAQ = [
  {
    q: "Where is my money held?",
    a: "Every contribution goes into a smart-contract escrow — not a personal account. The money can only leave by the rules set when the pool was created: to the recipient, or back to the contributors. No single person can withdraw early, and the rules can't be changed afterwards.",
  },
  {
    q: "Do I need to understand crypto?",
    a: "No. You sign in with a passkey — the same Face ID or fingerprint you already use. Balances are shown in plain dollars. The blockchain is just the plumbing; you never touch it.",
  },
  {
    q: "What if we don’t reach the goal?",
    a: "That depends on the rule the organizer chose when creating the pool. With “only when target is reached”, every contributor can claim back exactly what they put in. With the other rules, whatever was raised goes to the recipient at the deadline.",
  },
  {
    q: "Are there gas fees?",
    a: "No. Transactions are gasless — Harambee sponsors the network fees, so contributors pay exactly what they intend to give.",
  },
];

export default async function Home() {
  const isLoggedIn = !!(await getSessionUserId());
  const startHref = isLoggedIn ? "/pools/new" : "/register";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader isLoggedIn={isLoggedIn} />

      <main className="flex-1">
        <Hero
          image={HERO_IMAGE}
          headline={
            <>
              Pool together.
              <br />
              Give together.
              <br />
              <TypingText words={["Achieve together.", "Celebrate together."]} />
            </>
          }
          subtext="Harambee is the calm, trustworthy way for groups to collect money toward a shared goal — held safely in escrow, then released or refunded by the rules you set."
          actions={<PillLink href={startHref}>Start a pool</PillLink>}
        />

        {/* "all pull together" — the meaning of Harambee, as a band */}
        <PullTogetherBand />

        {/* How it works */}
        <Section id="how">
          <p className="type-eyebrow">How it works</p>
          <h2 className="type-heading-lg mt-3 max-w-[640px]">Three steps. About a minute.</h2>
          <FeatureGrid items={STEPS} className="mt-14" />
        </Section>

        {/* Product preview — UI mockup as a white card inset in cream */}
        <Section>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="type-heading-lg">Everyone sees the same ledger</h2>
              <p className="type-subheading mt-5 max-w-lg opacity-80">
                Every contribution is recorded on-chain and shown to the whole group — the total, the
                contributors, and exactly when the pool releases.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <PillLink href={startHref}>Start a pool</PillLink>
                <PillLink href="/docs" variant="outlined">
                  Read the docs
                </PillLink>
              </div>
            </div>
            <HeroMockup />
          </div>
        </Section>

        {/* Use cases — ink section: statement left, numbered ledger right */}
        <Section id="use-cases" ink className="!pt-24">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="type-eyebrow">Use cases</p>
              <h2 className="type-heading-lg mt-3">Whatever you’re raising for.</h2>
              <p className="mt-6 max-w-md text-body text-bone-white/85">
                From weddings to school fees to keeping a cooperative honest — one place to gather funds
                where everyone can see the total.
              </p>
              <PillLink href={startHref} variant="outlined-light" compact className="mt-8">
                Start yours
              </PillLink>
            </div>
            <ol className="border-t border-bone-white/25">
              {USE_CASES.map((u, i) => (
                <li key={u.title} className="flex gap-8 border-b border-bone-white/25 py-7">
                  <span className="pt-1.5 font-dm-mono text-sm text-bone-white/70">0{i + 1}</span>
                  <div>
                    <h3 className="font-champ text-[24px] font-bold leading-tight">{u.title}</h3>
                    <p className="mt-1.5 text-body text-bone-white/75">{u.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        {/* FAQ — a centered, ruled column */}
        <Section id="faq" className="!py-24" innerClassName="max-w-[880px]">
          <h2 className="type-heading-lg">Questions people ask first</h2>
          <div className="mt-10 border-t border-ink-black">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-ink-black">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 [&::-webkit-details-marker]:hidden">
                  <span className="font-champ text-[21px] font-bold leading-snug">{item.q}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden
                    className="shrink-0 transition-transform duration-200 group-open:rotate-45"
                  >
                    <path d="M12 4v16M4 12h16" />
                  </svg>
                </summary>
                <p className="max-w-[680px] pb-7 text-body text-ink-black/80">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Closing CTA — Marigold paired with an outlined black pill */}
        <Section>
          <SectionHeader
            align="center"
            title="Start pooling toward what matters"
            lead="Create your first pool in about a minute. No downloads, no gas fees, no jargon."
          />
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PillLink href={startHref}>Start a pool</PillLink>
            <PillLink href="#how" variant="outlined">
              See how it works
            </PillLink>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
