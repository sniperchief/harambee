import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata: Metadata = {
  title: "Documentation — Harambee",
  description:
    "How Harambee works: the pooling lifecycle, smart-contract escrow, the two-wallet custody model, gasless passkey contributions, and what's real vs. simulated in the demo.",
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
  { id: "honesty", label: "Real vs. simulated" },
  { id: "roadmap", label: "Roadmap" },
];

// Inline monospace token for contract functions / identifiers.
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-navy">
      {children}
    </code>
  );
}

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
    <section id={id} className="scroll-mt-24 border-t border-line pt-10">
      {eyebrow && <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>}
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-[28px]">{title}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Callout({
  tone = "brand",
  title,
  children,
}: {
  tone?: "brand" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  const ring = tone === "warning" ? "border-warning/40 bg-warning-50" : "border-brand/30 bg-brand-50";
  return (
    <div className={`rounded-[14px] border ${ring} p-4`}>
      <p className="text-sm font-semibold text-navy">{title}</p>
      <div className="mt-1.5 text-[14px] leading-relaxed text-navy/75">{children}</div>
    </div>
  );
}

export default async function DocsPage() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("harambee_session")?.value;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo size={30} />
          <ButtonLink href={isLoggedIn ? "/dashboard" : "/register"} size="sm" variant="primary">
            {isLoggedIn ? "Open app" : "Get started"}
          </ButtonLink>
        </div>
      </header>

      {/* Title band */}
      <div className="border-b border-line bg-surface-2/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-semibold text-brand-600">Documentation</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.1] tracking-tight text-navy sm:text-[44px]">
            How Harambee works
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            A technical walkthrough of the whole system — from the smart-contract escrow that holds
            every pool, to the passkey wallets that fund it, to what&apos;s genuinely live on-chain
            versus simulated for the demo. Built on Circle&apos;s Arc L1, settled in USDC.
          </p>
        </div>
      </div>

      {/* Body: sticky TOC + content */}
      <main className="mx-auto w-full max-w-6xl flex-1 gap-12 px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
            <ul className="mt-3 space-y-1.5 border-l border-line">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-sm text-muted hover:border-brand hover:text-navy"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 space-y-12">
          {/* Overview — no top border for the first one */}
          <section id="overview" className="scroll-mt-24">
            <p className="text-sm font-semibold text-brand-600">Overview</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-[28px]">
              What Harambee is
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">
              <p>
                <span className="font-semibold text-ink">Harambee</span> — Swahili for &ldquo;all
                pull together&rdquo; — is group-pooling for money toward a shared goal. Someone
                creates a pool with a target and a deadline, shares one link, and contributors fund
                it. Money is held in a smart-contract escrow, earns yield while it waits, and
                releases automatically to the recipient when the target is met — or refunds everyone
                if the deadline passes first.
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
                <span className="font-semibold text-ink">On-chain (Circle Arc L1 testnet).</span> Two
                Solidity contracts — <Code>PoolEscrow</Code> and <Code>YieldVault</Code> — hold and
                move funds. Arc&apos;s native currency <em>is</em> USDC (18 decimals at the protocol
                level), so pools use native-value transfers, not ERC-20 <Code>transferFrom</Code>.
              </li>
              <li>
                <span className="font-semibold text-ink">Circle infrastructure.</span> Developer-Controlled
                Wallets (server-custodied) for platform actions, Modular Wallets + WebAuthn passkeys
                (self-custodial ERC-4337 smart accounts) for contributors, and Gas Station to sponsor
                gas so contributions are free to make.
              </li>
              <li>
                <span className="font-semibold text-ink">App (Next.js 16 + Supabase).</span> The web
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
                <span className="font-semibold text-ink">1. Create.</span> The creator sets a title,
                target, deadline, release mode, and recipient (defaulting to their own wallet). The
                app calls <Code>createPool</Code> on-chain, then stores the pool with its real
                on-chain id and a shareable link.
              </li>
              <li>
                <span className="font-semibold text-ink">2. Contribute.</span> Anyone with the link
                signs in with a passkey and contributes. Each contribution calls{" "}
                <Code>contribute(poolId)</Code>, which forwards the funds straight into the yield
                vault and records the contributor.
              </li>
              <li>
                <span className="font-semibold text-ink">3. Wait & earn.</span> While the pool is
                open, its funds sit in the vault accruing yield against the pool&apos;s aggregate
                principal.
              </li>
              <li>
                <span className="font-semibold text-ink">4. Release or refund.</span> When the target
                is hit (or the deadline passes, depending on release mode), the pool withdraws
                principal + yield from the vault and either releases it to the recipient or freezes it
                for proportional refunds. The app polls each open pool so deadline-based outcomes fire
                on their own, with no manual trigger.
              </li>
            </ol>
          </Section>

          <Section id="contracts" title="Smart contracts" eyebrow="On-chain">
            <p>
              <span className="font-semibold text-ink">PoolEscrow</span> is the custody + release
              contract. Key functions:
            </p>
            <ul className="space-y-2">
              <li>
                <Code>createPool(target, deadline, recipient)</Code> — opens a pool, returns its id.
              </li>
              <li>
                <Code>contribute(poolId)</Code> — payable; adds to the pool total, records{" "}
                <Code>msg.sender</Code>&apos;s contribution, and forwards the value into the vault.
              </li>
              <li>
                <Code>checkAndRelease(poolId)</Code> — permissionless; enforces the release rule
                (target met, or deadline passed), pulls funds back from the vault, and either releases
                to the recipient or flips the pool to refundable.
              </li>
              <li>
                <Code>refund(poolId)</Code> — pull-based; each contributor claims their principal plus
                a proportional share of accrued yield, computed as{" "}
                <Code>principal × finalValue / totalPrincipal</Code> using integer math (no float
                rounding).
              </li>
            </ul>
            <p>
              Three <span className="font-semibold text-ink">release modes</span> are supported:
              release on target-or-deadline (whichever is first), on target only (refund if the
              deadline beats it), or at the deadline only.
            </p>
            <p>
              <span className="font-semibold text-ink">YieldVault</span> holds contributed funds and
              accrues linear interest at a fixed rate, keyed by pool id. <Code>PoolEscrow</Code> is
              its only caller: it deposits on <Code>contribute</Code> and withdraws the full position
              (principal + yield) on release/refund.
            </p>
          </Section>

          <Section id="custody" title="The two-wallet custody model" eyebrow="Design">
            <p>
              Harambee deliberately uses two different wallet systems, because two different jobs need
              two different trust models:
            </p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-ink">Contributors are self-custodial.</span> Each
                user has a Circle Modular Wallet — an ERC-4337 smart account owned by their passkey.
                Only they can authorize spending from it. This matters because{" "}
                <Code>contribute()</Code> and <Code>refund()</Code> use <Code>msg.sender</Code> to
                decide who contributed and who gets refunded — so those calls must come from the
                user&apos;s own wallet.
              </li>
              <li>
                <span className="font-semibold text-ink">The platform is server-custodial.</span> A
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
              <a href="#roadmap" className="font-semibold text-brand-600 hover:underline">
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
              the signature before issuing a session. There is no password to steal and no seed phrase
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
              local-currency payout. A real off-ramp is a mainnet-gated roadmap item.
            </Callout>
          </Section>

          <Section id="honesty" title="Real vs. simulated" eyebrow="Transparency">
            <p>
              In the spirit of the escrow itself, here&apos;s exactly what is genuinely live on-chain
              versus stood in for the demo:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line-strong text-navy">
                    <th className="py-2 pr-4 font-semibold">Capability</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    ["Escrow, contribute, release, refund", "Real", "Live on Arc testnet, end-to-end."],
                    ["Passkey wallets + gasless txs", "Real", "Self-custodial ERC-4337 + Gas Station."],
                    ["Yield vault", "Simulated", "Fixed invented APY, stands in for Morpho; needs manual reserve top-ups to pay out."],
                    ["Local-currency amount", "Simulated", "Live public FX rate, display-only — not StableFX, not a payout."],
                    ["Credit-card contributions", "Roadmap", "Impossible on testnet; mainnet-gated."],
                    ["Fiat off-ramp to bank/mobile money", "Roadmap", "No provider supports Arc yet."],
                  ].map(([cap, status, notes]) => (
                    <tr key={cap} className="border-b border-line align-top">
                      <td className="py-2.5 pr-4 font-medium text-ink">{cap}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            status === "Real"
                              ? "bg-success-50 text-success"
                              : status === "Simulated"
                                ? "bg-warning-50 text-warning"
                                : "bg-surface-2 text-muted"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-2.5">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="roadmap" title="Roadmap" eyebrow="What's next">
            <p>The clearest next milestones, most gated on Arc reaching mainnet:</p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-ink">Credit-card contributions.</span> Let
                non-crypto users chip in with a card. This can&apos;t exist on testnet — a real charge
                needs real value on the other side. On mainnet: a card payment on-ramp mints USDC, the
                platform routes it into the pool on the contributor&apos;s behalf (custodial), and
                their share is tracked off-chain. This is the custody fork described above.
              </li>
              <li>
                <span className="font-semibold text-ink">Real yield.</span> Replace the stand-in vault
                with a live lending protocol (Morpho is the closest structural match), so yield is a
                real market rate rather than a funded reserve.
              </li>
              <li>
                <span className="font-semibold text-ink">Fiat off-ramp.</span> Once Arc is on mainnet
                and off-ramp providers support it (Yellow Card, Kotani Pay, and similar cover African
                bank + mobile-money rails), a recipient could cash out to local currency directly.
              </li>
              <li>
                <span className="font-semibold text-ink">Production hardening.</span> Signed/expiring
                sessions, event-driven release triggers, and per-contributor bookkeeping for the
                custodial lane.
              </li>
            </ul>
            <div className="pt-2">
              <ButtonLink href={isLoggedIn ? "/pools/new" : "/register"} variant="coral" size="lg">
                Start a pool
              </ButtonLink>
            </div>
          </Section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
