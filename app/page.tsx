import { getSessionUserId } from "@/lib/session";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { PullTogetherBand } from "@/components/marketing/PullTogetherBand";
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
    title: "Create a fundraising campaign",
    body: "Say what you’re raising money for, then set a goal and a deadline. No bank forms, no jargon.",
  },
  {
    marker: "02",
    title: "Share one link",
    body: "Send it to people anywhere in the world. They contribute with a passkey — Face ID or fingerprint. Nothing to download.",
  },
  {
    marker: "03",
    title: "Funds are settled by your rules",
    body: "Contributions are held in escrow until the goal or deadline is reached, then go to the recipient — or back to contributors.",
  },
];

const WHY: Feature[] = [
  {
    title: "Raise from anywhere",
    body: "Invite contributors from different countries to give in USDC, without relying on traditional international bank transfers.",
  },
  {
    title: "Progress in real time",
    body: "The amount raised, the number of contributors and each new contribution update live for everyone.",
  },
  {
    title: "Held securely",
    body: "Contributions wait in escrow — not in anyone’s personal account — until the agreed rules settle them.",
  },
];

// What every contributor can see on a fundraiser page.
const TRANSPARENCY = [
  "How much has been raised",
  "How many people have contributed",
  "Recent contributions, as they happen",
  "The goal and the deadline",
  "What happens when the goal is reached",
  "What happens if the deadline passes first",
];

const USE_CASES = [
  { title: "Medical expenses", body: "Cover treatment, surgery or hospital bills with help from people near and far." },
  { title: "Natural disaster relief", body: "Rally support quickly when floods, fires or storms hit a community." },
  { title: "Funerals", body: "Share the cost of a send-off with family and friends, wherever they live." },
  { title: "Tuition fees", body: "Keep a student in class with contributions from everyone who believes in them." },
  { title: "Community projects", body: "Fund the borehole, the clinic, the church roof." },
  { title: "Family support", body: "Come together quickly when someone at home needs help." },
];

const FAQ = [
  {
    q: "Where is my money held?",
    a: "Every contribution goes into an onchain escrow — not a personal account. The money can only leave by the rules set at the start: to the recipient, or back to the contributors. No single person can withdraw early, and the rules can't be changed afterwards.",
  },
  {
    q: "Can people in other countries contribute?",
    a: "Yes. Anyone with the link can contribute in USDC from wherever they are, without an international bank transfer. Everyone sees the same total in dollars, and you can also show an approximate amount in a local currency.",
  },
  {
    q: "Do I need to understand crypto?",
    a: "No. You sign in with a passkey — the same Face ID or fingerprint you already use. Balances are shown in plain dollars. The blockchain is just the plumbing; you never touch it.",
  },
  {
    q: "What if we don’t reach the goal?",
    a: "That depends on the rule the organizer chose at the start. With “only if the goal is reached”, every contributor can claim back exactly what they put in. With the other rules, whatever was raised goes to the recipient at the deadline. The rule is always shown on the page.",
  },
  {
    q: "Are there gas fees?",
    a: "Just a few cents. Each contribution or refund pays a small network fee in USDC from your own balance. Getting started is free.",
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
              Raise money together,
              <br />
              from anywhere.
            </>
          }
          subtext="Harambee is a global fundraising platform. Collect USDC contributions from people in any country, without international bank transfers. Everyone sees progress in real time, and funds are held securely until your rules are met."
          actions={<PillLink href={startHref}>Fundraise</PillLink>}
        />

        {/* "all pull together" — the meaning of Harambee, as a band */}
        <PullTogetherBand />

        {/* How it works */}
        <Section id="how">
          <p className="type-eyebrow">How it works</p>
          <h2 className="type-heading-lg mt-3 max-w-[640px]">Three steps. About a minute.</h2>
          <FeatureGrid items={STEPS} className="mt-14" />
        </Section>

        {/* Cross-border */}
        <Section id="anywhere" className="!pt-0">
          <p className="type-eyebrow">Built for raising across borders</p>
          <h2 className="type-heading-lg mt-3 max-w-[640px]">Your supporters don’t all live in one place.</h2>
          <FeatureGrid items={WHY} className="mt-14" />
        </Section>

        {/* Product preview — UI mockup as a white card inset in cream */}
        <Section>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="type-eyebrow">Transparency</p>
              <h2 className="type-heading-lg mt-3">Everyone sees the same numbers</h2>
              <p className="type-subheading mt-5 max-w-lg opacity-80">
                Every contribution is recorded onchain and shown publicly. Contributors can see:
              </p>
              <ul className="mt-6 max-w-lg border-t border-ink-black">
                {TRANSPARENCY.map((t) => (
                  <li key={t} className="border-b border-dashed border-oat py-3 text-body">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <PillLink href={startHref}>Fundraise</PillLink>
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
                From medical bills to disaster relief to tuition fees — one place to raise money from
                people near and far, where everyone can see the total.
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
            title="Raise money together, from anywhere"
            lead="Get started in about a minute. No downloads, no jargon."
          />
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PillLink href={startHref}>Fundraise</PillLink>
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
