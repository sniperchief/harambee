# Harambee

**Pool together. Give together. Achieve together.**

Harambee — Swahili for *"all pull together"* — is a group-pooling payments app: a calm, trustworthy way for a group to collect money toward a shared goal. Someone creates a pool with a target and a deadline, shares one link, and contributors fund it. Money is held in a smart-contract escrow and leaves it only by the pool's rules: released to the recipient, or refunded to the contributors.

Built on **Circle's Arc mainnet**, settled in **USDC**, funded with **passkeys**, with network fees of a few cents paid in USDC.

🔗 **Live demo:** https://harambee-flame.vercel.app
📖 **Technical docs:** https://harambee-flame.vercel.app/docs

---

## The problem

Group money collections — weddings, school fees, family emergencies, community projects, savings circles — usually run on trust and a spreadsheet. Who paid? Where's the money sitting? Can the organizer be trusted not to dip in? What if we don't hit the goal?

Harambee replaces that trust gap with an on-chain escrow: no single person can withdraw early, everyone can see the total, and the pool's rules — set when it's created — decide whether the money is released or refunded.

## What it does

- **Create a pool** in about a minute — a title, a target, a deadline. No bank forms, no crypto jargon.
- **Share one link.** Anyone can contribute by signing in with a **passkey** (Face ID / fingerprint) — no app to download, no seed phrase to write down.
- **Funds are held in escrow**, not a personal account.
- **Automatic release** the moment the target is hit (or at the deadline, depending on the pool's release mode).
- **Refunds** if a "target only" pool misses its goal — every contributor can claim back exactly what they put in.
- **Tiny fees.** Contributors pay a few cents of network fee in USDC from their own wallet; creating a pool is free.
- **Local-currency display** — a pool can show its value in NGN, KES, GHS and others using live FX rates (informational; settlement stays in USDC).

## How it works

1. **Create** — the creator sets the goal; the app calls `createPool` on-chain and returns a shareable link.
2. **Contribute** — each contributor signs `contribute(poolId)` with their own passkey wallet; the USDC is held in the escrow contract. The server verifies the transaction on-chain before recording it.
3. **Release or refund** — when the target is met or the deadline passes, the escrow either releases everything raised to the recipient or marks the pool refundable so each contributor can claim back their own contribution. The app (and a cron) checks open pools so deadline-based outcomes fire on their own.

## Built on Circle

Harambee leans on the Circle stack end-to-end:

| Product | Used for |
|---|---|
| **Arc** (mainnet, chain 5042) | The chain. Arc's native currency *is* USDC, so pools use native-value transfers — no ERC-20 approvals. |
| **Modular Wallets + Passkeys** | Self-custodial ERC-4337 smart accounts owned by a WebAuthn passkey — contributors' wallets. |
| **Developer-Controlled Wallets** | A server-side platform wallet that submits `createPool` / `checkAndRelease`. |
| **Smart Contract Platform** | Deploying and reading the escrow contract. |

## Smart contracts

- **`PoolEscrow.sol`** — custody + release, and nothing else. `createPool`, `contribute` (payable; funds stay in the contract), `checkAndRelease` (permissionless; enforces the pool's rule), and pull-based `refund` (each contributor gets back exactly their own contribution, once). Three release modes: target-or-deadline, target-only, deadline-only. No owner, no admin functions.

Contract tests (`npm run test:contracts`) cover creation, contributions, every release mode, refunds, unauthorized withdrawals and re-entrancy.

## What's live

| Capability | Status | Notes |
|---|---|---|
| Escrow, contribute, release, refund | ✅ Live | Arc mainnet, real USDC. |
| Passkey wallets | ✅ Live | Self-custodial ERC-4337; contributors pay gas in USDC. |
| Local-currency amount | ℹ️ Display only | Live public FX rate, informational — not a payout. (Circle StableFX only swaps USDC↔EURC, no fiat leg.) |
| Credit-card contributions | 🔜 Roadmap | Not built yet. |
| Fiat off-ramp to bank / mobile money | 🔜 Roadmap | No off-ramp provider supports Arc yet. |

The [`/docs`](https://harambee-flame.vercel.app/docs) page has the full technical deep-dive, including the two-wallet custody model.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · viem · Solidity 0.8 · Circle SDKs (Developer-Controlled Wallets, Modular Wallets Core, Smart Contract Platform).

## Network

Harambee runs on **Arc mainnet** only. The network is defined in one place, [`lib/network.ts`](lib/network.ts):

| | |
|---|---|
| Chain ID | `5042` |
| RPC | `https://rpc.mainnet.arc.io` (override server-side with `ARC_RPC_URL`) |
| Explorer | `https://explorer.arc.io` |
| Circle blockchain id | `ARC` |
| USDC | Native gas token (18 decimals); ERC-20 interface at `0x3600000000000000000000000000000000000000` |

Circle `TEST_` API/client keys are rejected at runtime, so a testnet key can't be used by accident.

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
   You'll need a Supabase project and a Circle developer account with **LIVE** keys (API key, entity secret, wallet set, client key). Public and server-only variables are separated and commented in `.env.local.example`.
2. For a new Supabase project, run `supabase/setup-mainnet.sql` once in the Supabase SQL Editor. It combines every migration in `supabase/migrations/`, including locking the tables to the server (Row Level Security).
3. Start the dev server:
   ```bash
   npm run dev
   ```

Open http://localhost:3000. To contribute, register a passkey, then send USDC on Arc to the wallet address shown in Settings. This is real money, so use small amounts while testing.

> **Windows note:** if `npm run …` exits silently, set `ComSpec` first: `$env:ComSpec = "C:\Windows\System32\cmd.exe"`.

## Checks

```bash
npm run test:contracts   # escrow contract tests (Hardhat)
npm run typecheck
npm run lint
npm run build
npm run check:mainnet    # read-only: validates env, chain, USDC, escrow, platform wallet
```

## Deploying to mainnet

1. `npm run circle:create-platform-wallet` → set `HARAMBEE_PLATFORM_WALLET_ID`, then send the printed address a little USDC for gas.
2. `npm run contracts:compile-pool-escrow && npm run test:contracts`
3. `npm run contracts:deploy-pool-escrow -- <platformWalletId>` → set `POOL_ESCROW_CONTRACT_ADDRESS`.
4. `npm run contracts:verify-pool-escrow -- <address>` to verify the source on explorer.arc.io.
5. In the Circle console, add the production domain to the client key's allowed domains. (No Gas Station policy: contributors pay their own gas.)
6. Set all variables from `.env.local.example` in the hosting environment and run `npm run check:mainnet`.
7. Deploy the app. Optionally schedule `GET /api/cron/check-pools` (Vercel Cron sends `CRON_SECRET` automatically).
8. Test the full flow with a small real amount: create a pool, contribute, and confirm the release (or refund) on explorer.arc.io.

## Roadmap

- **Credit-card contributions** for non-crypto users (custodial lane).
- **Fiat off-ramp** to local bank / mobile-money rails once Arc is supported.
- Expiring sessions and event-driven release triggers.
