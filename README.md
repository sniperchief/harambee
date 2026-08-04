# Harambee

**Pool together. Grow together. Achieve together.**

Harambee — Swahili for *"all pull together"* — is a group-pooling payments app: a calm, trustworthy way for a group to collect money toward a shared goal. Someone creates a pool with a target and a deadline, shares one link, and contributors fund it. Money is held in a smart-contract escrow, earns yield while it waits, and releases automatically to the recipient when the goal is met — or refunds everyone if the deadline passes first.

Built on **Circle's Arc L1**, settled in **USDC**, funded with **passkeys** and **no gas fees**.

🔗 **Live demo:** https://harambee-flame.vercel.app
📖 **Technical docs:** https://harambee-flame.vercel.app/docs

---

## The problem

Group money collections — weddings, school fees, family emergencies, community projects, savings circles — usually run on trust and a spreadsheet. Who paid? Where's the money sitting? Can the organizer be trusted not to dip in? What if we don't hit the goal?

Harambee replaces that trust gap with an audited on-chain escrow: no single person can withdraw early, everyone can see the total, and if the goal isn't reached, every contributor gets a full refund.

## What it does

- **Create a pool** in about a minute — a title, a target, a deadline. No bank forms, no crypto jargon.
- **Share one link.** Anyone can contribute by signing in with a **passkey** (Face ID / fingerprint) — no app to download, no seed phrase to write down.
- **Funds are held in escrow**, not a personal account, and **earn yield** while they wait.
- **Automatic release** the moment the target is hit (or at the deadline, depending on the pool's release mode).
- **Automatic refunds** if the goal isn't met — every contributor can claim their principal back, plus their share of any yield.
- **Gasless.** Network fees are sponsored, so a contributor pays exactly what they intend to give.
- **Local-currency display** — a pool can show its value in NGN, KES, GHS and others using live FX rates (informational; settlement stays in USDC).

## How it works

1. **Create** — the creator sets the goal; the app calls `createPool` on-chain and returns a shareable link.
2. **Contribute** — each contributor signs `contribute(poolId)` with their own passkey wallet; funds forward straight into a yield vault.
3. **Wait & earn** — while open, the pool's funds accrue yield against its aggregate principal.
4. **Release or refund** — when the target is met or the deadline passes, the pool withdraws principal + yield and either releases to the recipient or freezes it for proportional refunds. The app polls open pools so deadline-based outcomes fire on their own.

## Built on Circle

Harambee leans on the Circle stack end-to-end:

| Product | Used for |
|---|---|
| **Arc L1** (testnet) | The chain. Arc's native currency *is* USDC, so pools use native-value transfers — no ERC-20 approvals. |
| **Modular Wallets + Passkeys** | Self-custodial ERC-4337 smart accounts owned by a WebAuthn passkey — contributors' wallets. |
| **Gas Station** | Sponsors gas so contributions are free to make. |
| **Developer-Controlled Wallets** | A server-side platform wallet that submits `createPool` / `checkAndRelease`. |
| **Smart Contract Platform** | Deploying and reading the escrow + vault contracts. |

## Smart contracts

- **`PoolEscrow.sol`** — custody + release. `createPool`, `contribute` (payable, forwards to the vault), `checkAndRelease` (permissionless; enforces target-or-deadline), and pull-based `refund` (principal + proportional yield, integer math). Three release modes: target-or-deadline, target-only, deadline-only.
- **`YieldVault.sol`** — holds contributed funds and accrues linear interest, keyed by pool id. `PoolEscrow` is its only caller.

## What's live vs. simulated

Built for a hackathon on Arc **testnet** — in the spirit of the escrow, here's exactly what's real:

| Capability | Status | Notes |
|---|---|---|
| Escrow, contribute, release, refund | ✅ Real | Live on Arc testnet, end-to-end. |
| Passkey wallets + gasless transactions | ✅ Real | Self-custodial ERC-4337 + Gas Station. |
| Yield vault | 🟡 Simulated | Fixed invented APY; stands in for a lending protocol (Morpho is the closest match). |
| Local-currency amount | 🟡 Simulated | Live public FX rate, display-only — not a payout. (Circle StableFX only swaps USDC↔EURC, no fiat leg.) |
| Credit-card contributions | 🔜 Roadmap | Impossible on testnet — a real charge needs real value. Mainnet-gated. |
| Fiat off-ramp to bank / mobile money | 🔜 Roadmap | No off-ramp provider supports Arc yet. |

The [`/docs`](https://harambee-flame.vercel.app/docs) page has the full technical deep-dive, including the two-wallet custody model and the roadmap architecture.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · viem · Solidity 0.8 · Circle SDKs (Developer-Controlled Wallets, Modular Wallets Core, Smart Contract Platform).

## Running locally

```bash
git clone https://github.com/sniperchief/harambee.git
cd harambee
npm install
```

1. Copy the env template and fill in your own values:
   ```bash
   cp .env.local.example .env.local
   ```
   You'll need a Supabase project and a Circle developer account (API key, entity secret, wallet set, client key). Each variable is commented in `.env.local.example`.
2. Apply the SQL migrations in `supabase/migrations/` via the Supabase SQL Editor.
3. Start the dev server:
   ```bash
   npm run dev
   ```

Open http://localhost:3000. To contribute, register a passkey, then fund the new wallet from the Circle testnet faucet (linked in-app).

> **Windows note:** if `npm run …` exits silently, set `ComSpec` first: `$env:ComSpec = "C:\Windows\System32\cmd.exe"`.

## Roadmap

- **Credit-card contributions** for non-crypto users (custodial lane, mainnet-gated).
- **Real yield** via a live lending protocol (e.g. Morpho).
- **Fiat off-ramp** to local bank / mobile-money rails once Arc is supported.
- Production auth hardening and event-driven release triggers.
