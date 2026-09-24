import { getSessionUserId } from "@/lib/session";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Section as PageSection, SectionDivider } from "@/components/design/Section";
import { SurfaceCard, WarmCard } from "@/components/design/Card";
import { Tag } from "@/components/design/Tag";
import { PillLink } from "@/components/design/PillButton";

export const metadata: Metadata = {
  title: "Documentation — Harambee",
  description:
    "How Harambee works: the pooling lifecycle, smart-contract escrow, the two-wallet custody model, gasless passkey contributions, and what's live today.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "stack", label: "Architecture & stack" },
  { id: "lifecycle", label: "Pool lifecycle" },
  { id: "contracts", label: "Smart contracts" },
  { id: "custody", label: "Two-wallet custody" },
  { id: "gasless", label: "Gasless contributions" },
  { id: "auth", label: "Passkey authentication" },
  { id: "currency", label: "Local-currency display" },
  { id: "honesty", label: "What's live" },
  { id: "roadmap", label: "Roadmap" },
];

// Inline DM Mono token for contract functions / identifiers.
function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-buttercream px-1.5 py-0.5 font-dm-mono text-[15px] text-ink-black [overflow-wrap:anywhere]">{children}</code>;
}

// A documentation chapter: Champ heading over DM Sans body, ruled off by a
// Section Divider.
function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <SectionDivider className="mb-12" />
      {eyebrow && <p className="font-dm-mono text-sm text-char">{eyebrow}</p>}
      <h2 className="type-heading mt-3">{title}</h2>
      <div className="mt-6 space-y-4 text-body text-ink-black/80">{children}</div>
    </section>
  );
}

// Callouts are Warm Cards; the "warning" tone adds an ink rule on the left
// (DESIGN.md: express semantics through form, not hue).
function Callout({
  tone = "brand",
  title,
  children,
}: {
  tone?: "brand" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <WarmCard className={tone === "warning" ? "border-l-[4px] border-ink-black" : ""}>
      <p className="type-sub-display">{title}</p>
      <div className="mt-2 text-body text-ink-black/80">{children}</div>
    </WarmCard>
  );
}

export default async function DocsPage() {
  const isLoggedIn = !!(await getSessionUserId());

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader isLoggedIn={isLoggedIn} />

      <PageSection>
        <Tag>Documentation</Tag>
        <h1 className="type-display mt-6 max-w-4xl">How Harambee works</h1>
        <p className="type-subheading mt-6 max-w-2xl opacity-80">
          A technical walkthrough of the whole system — from the smart-contract escrow that holds
          every pool, to the passkey wallets that fund it, to what&apos;s live today. Built on
          Circle&apos;s Arc network, settled in USDC.
        </p>
      </PageSection>

      {/* Body: sticky TOC card + chapters */}
      <main className="section__inner w-full flex-1 gap-12 pb-20 lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <SurfaceCard className="sticky top-20 !p-6">
            <p className="text-sm text-char">On this page</p>
            <ul className="mt-3">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="block py-1.5 text-body text-ink-black underline-offset-4 hover:underline">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </aside>

        <article className="min-w-0 space-y-12">
          {/* Overview — no top divider for the first one */}
          <section id="overview" className="scroll-mt-20">
            <p className="font-dm-mono text-sm text-char">Overview</p>
            <h2 className="type-heading mt-3">
              What Harambee is
            </h2>
            <div className="mt-6 space-y-4 text-body text-ink-black/80">
              <p>
                <span className="font-semibold text-ink-black">Harambee</span> — Swahili for &ldquo;all
                pull together&rdquo; — is group-pooling for money toward a shared goal. Someone
                creates a pool with a target and a deadline, shares one link, and contributors fund
                it. Money is held in a smart-contract escrow and leaves it only by the pool&apos;s
                rules: released to the recipient, or refunded to the contributors.
              </p>
              <p>
                The design goal is that a non-crypto user never has to think about crypto. They sign
                in with a passkey (Face ID / fingerprint), see balances in plain dollars, and pay no
                gas fees. The blockchain is plumbing, not the product.
              </p>
            </div>
          </section>

          <Section id="stack" title="Architecture & stack" eyebrow="Foundations">
            <p>The system has three layers:</p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-ink-black">On-chain (Arc mainnet).</span> One Solidity
                contract, <Code>PoolEscrow</Code>, holds and moves funds. Arc&apos;s native currency{" "}
                <em>is</em> USDC (18 decimals at the protocol level), so pools use native-value
                transfers, not ERC-20 <Code>transferFrom</Code>.
              </li>
              <li>
                <span className="font-semibold text-ink-black">Circle infrastructure.</span> Developer-Controlled
                Wallets (server-custodied) for platform actions, Modular Wallets + WebAuthn passkeys
                (self-custodial ERC-4337 smart accounts) for contributors, and Gas Station to sponsor
                gas so contributions are free to make.
              </li>
              <li>
                <span className="font-semibold text-ink-black">App (Next.js 16 + Supabase).</span> The web
                app (App Router, TypeScript, Tailwind) plus a Postgres database that mirrors on-chain
                state for fast reads. The contract is always the source of truth — Supabase is synced
                from it after every state change, never the other way around.
              </li>
            </ul>
          </Section>

          <Section id="lifecycle" title="The pool lifecycle" eyebrow="Flow">
            <p>Every pool moves through the same path:</p>
            <ol className="space-y-3">
              <li>
                <span className="font-semibold text-ink-black">1. Create.</span> The creator sets a title,
                target, deadline, release mode, and recipient (defaulting to their own wallet). The
                app calls <Code>createPool</Code> on-chain, then stores the pool with its real
                on-chain id and a shareable link.
              </li>
              <li>
                <span className="font-semibold text-ink-black">2. Contribute.</span> Anyone with the link
                signs in with a passkey and contributes. Each contribution calls{" "}
                <Code>contribute(poolId)</Code>, which holds the funds in the escrow contract and
                records the contributor. The server then checks the transaction on-chain before
                showing it in the pool&apos;s history.
              </li>
              <li>
                <span className="font-semibold text-ink-black">3. Release or refund.</span> When the target
                is hit (or the deadline passes, depending on release mode), the escrow either releases
                everything raised to the recipient or marks the pool refundable, so each contributor
                can take back exactly what they put in. The app checks open pools so deadline-based
                outcomes fire on their own, with no manual trigger.
              </li>
            </ol>
          </Section>

          <Section id="contracts" title="Smart contracts" eyebrow="On-chain">
            <p>
              <span className="font-semibold text-ink-black">PoolEscrow</span> is the custody + release
              contract. Key functions:
            </p>
            <ul className="space-y-2">
              <li>
                <Code>createPool(target, deadline, recipient, releaseMode)</Code> — opens a pool and
                emits its id in <Code>PoolCreated</Code>.
              </li>
              <li>
                <Code>contribute(poolId)</Code> — payable; adds to the pool total and records{" "}
                <Code>msg.sender</Code>&apos;s contribution. The funds stay in the contract.
              </li>
              <li>
                <Code>checkAndRelease(poolId)</Code> — permissionless; enforces the release rule
                (target met, or deadline passed) and either pays everything raised to the recipient or
                flips the pool to refundable.
              </li>
              <li>
                <Code>refund(poolId)</Code> — pull-based; once a pool is refundable, each contributor
                claims back exactly what they contributed, once.
              </li>
            </ul>
            <p>
              Three <span className="font-semibold text-ink-black">release modes</span> are supported:
              release on target-or-deadline (whichever is first), on target only (refund if the
              deadline beats it), or at the deadline only.
            </p>
            <p>
              The contract has no owner and no admin functions: nobody, including Harambee, can move
              funds except through these rules.
            </p>
          </Section>

          <Section id="custody" title="The two-wallet custody model" eyebrow="Design">
            <p>
              Harambee deliberately uses two different wallet systems, because two different jobs need
              two different trust models:
            </p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-ink-black">Contributors are self-custodial.</span> Each
                user has a Circle Modular Wallet — an ERC-4337 smart account owned by their passkey.
                Only they can authorize spending from it. This matters because{" "}
                <Code>contribute()</Code> and <Code>refund()</Code> use <Code>msg.sender</Code> to
                decide who contributed and who gets refunded — so those calls must come from the
                user&apos;s own wallet.
              </li>
              <li>
                <span className="font-semibold text-ink-black">The platform is server-custodial.</span> A
                single Developer-Controlled wallet submits <Code>createPool</Code> and{" "}
                <Code>checkAndRelease</Code> — calls where <Code>msg.sender</Code> is irrelevant
                (anyone may trigger a release; the contract enforces the rule). This keeps the browser
                from ever needing to know about internal wallet ids.
              </li>
            </ul>
            <Callout title="Why this split is the interesting part">
              It&apos;s also the fork the roadmap builds on: a future credit-card contributor has no
              passkey wallet, so their contribution can&apos;t be self-custodial — the platform would
              custody it and track their share off-chain. Two lanes, one pool. See{" "}
              <a href="#roadmap" className="font-semibold text-ink-black underline underline-offset-4">
                Roadmap
              </a>
              .
            </Callout>
          </Section>

          <Section id="gasless" title="Gasless contributions" eyebrow="UX">
            <p>
              Contributions are ERC-4337 user operations sent through Circle&apos;s bundler, with Gas
              Station as the paymaster. The same Circle transport doubles as bundler and paymaster
              endpoint, so declaring <Code>paymaster: true</Code> is all it takes for gas to be
              sponsored. The contributor pays exactly what they intend to give — not a cent of gas on
              top.
            </p>
            <p>
              One Arc-specific detail: the default fee estimate underprices{" "}
              <Code>maxPriorityFeePerGas</Code> and trips the bundler&apos;s precheck, so contributions
              use Circle&apos;s own gas-price oracle with a 1 gwei floor to keep the operation valid.
            </p>
          </Section>

          <Section id="auth" title="Passkey authentication" eyebrow="Security">
            <p>
              Sign-in is server-verified WebAuthn. The browser requests a fresh, single-use challenge
              from the server, the passkey signs it with one biometric prompt, and the server verifies
              the signature before issuing a signed session cookie. There is no password to steal and no seed phrase
              to write down — the passkey never leaves the device.
            </p>
          </Section>

          <Section id="currency" title="Local-currency display" eyebrow="Money">
            <p>
              A pool can optionally show its value in a local currency (NGN, KES, GHS, and others). At
              release time the released USDC amount is converted using a live public exchange-rate
              feed and shown alongside the real on-chain figure.
            </p>
            <Callout tone="warning" title="Informational only — not a payout">
              This number does not move real fiat. Settlement stays in USDC. Circle&apos;s StableFX
              was investigated for a true conversion and ruled out: it only swaps USDC↔EURC between
              KYB-onboarded institutional counterparties, with no fiat leg — so it can&apos;t produce a
              local-currency payout. A real off-ramp is a roadmap item.
            </Callout>
          </Section>

          <Section id="honesty" title="What's live" eyebrow="Transparency">
            <p>
              In the spirit of the escrow itself, here&apos;s exactly what is live and what
              isn&apos;t:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-body">
                <thead>
                  <tr className="border-b-[1.5px] border-ink-black text-ink-black">
                    <th className="py-2 pr-4 font-semibold">Capability</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-ink-black/80">
                  {[
                    ["Escrow, contribute, release, refund", "Real", "Live on Arc mainnet with real USDC."],
                    ["Passkey wallets + gasless txs", "Real", "Self-custodial ERC-4337 + Gas Station."],
                    ["Local-currency amount", "Display only", "Live public FX rate, informational — not StableFX, not a payout."],
                    ["Credit-card contributions", "Roadmap", "Not built yet."],
                    ["Fiat off-ramp to bank/mobile money", "Roadmap", "No provider supports Arc yet."],
                  ].map(([cap, status, notes]) => (
                    <tr key={cap} className="border-b border-oat align-top">
                      <td className="py-2.5 pr-4 font-medium text-ink-black">{cap}</td>
                      <td className="py-2.5 pr-4">
                        <Tag tone={status === "Real" ? "black" : "cream"}>{status}</Tag>
                      </td>
                      <td className="py-2.5">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="roadmap" title="Roadmap" eyebrow="What's next">
            <p>The clearest next milestones:</p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-ink-black">Credit-card contributions.</span> Let
                non-crypto users chip in with a card: a card payment on-ramp mints USDC, the platform
                routes it into the pool on the contributor&apos;s behalf (custodial), and their share is
                tracked off-chain. This is the custody fork described above.
              </li>
              <li>
                <span className="font-semibold text-ink-black">Fiat off-ramp.</span> Once off-ramp providers
                support Arc (Yellow Card, Kotani Pay, and similar cover African bank + mobile-money
                rails), a recipient could cash out to local currency directly.
              </li>
              <li>
                <span className="font-semibold text-ink-black">Production hardening.</span> Expiring
                sessions, event-driven release triggers, and per-contributor bookkeeping for the
                custodial lane.
              </li>
            </ul>
            <div className="pt-2">
              <PillLink href={isLoggedIn ? "/pools/new" : "/register"}>Start a pool</PillLink>
            </div>
          </Section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
