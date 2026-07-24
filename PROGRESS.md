# Harambee — build progress

Group-pooling payments app on Circle's Arc L1. Built in strict, small, confirmed-before-proceeding steps. This file is the handoff doc — if the chat/context resets, read this first, then the numbered steps in the original prompt, to know exactly where things stand.

**Status: Steps 1–9 done and confirmed working. Step 10 (wrap-up) is next.**

## Full test walkthrough (pool creation → contribute → release/refund)

Run `npm run dev` first, and prefix any `npm run` command with `$env:ComSpec = "C:\Windows\System32\cmd.exe"` if it silently does nothing (see gotcha below). Known funded wallets: Wallet A `699d7c8f-2f9e-5a74-83d1-f6054bf376c6`, Wallet B `fa99f41e-145c-5dbb-a4f5-53e728ceddfc` (address `0x1a8d0bbae8d8eb23cc031f3cf51d04de99463dc6`). Get more wallet ids anytime via `npm run circle:list-wallets`.

**1. Get a creator id** (any existing `users.id` works — pool creation just needs a valid FK, it doesn't have to be the wallet submitting the on-chain call):
```
npm run test:db
```

**2. Create a pool:**
```
curl -X POST http://localhost:3000/api/pools -H "Content-Type: application/json" -d "{\"creatorId\":\"<user-id>\",\"walletId\":\"699d7c8f-2f9e-5a74-83d1-f6054bf376c6\",\"title\":\"My Pool\",\"targetAmount\":\"0.5\",\"deadline\":\"2026-08-01T00:00:00Z\",\"recipientWalletAddress\":\"0x1a8d0bbae8d8eb23cc031f3cf51d04de99463dc6\"}"
```
Copy the returned `pool.id` (Supabase UUID) — every step below needs it. `targetAmount` is a human decimal string (e.g. `"0.5"`), not wei. `deadline` is any ISO 8601 timestamp in the future.

**3. Contribute** (repeatable, from any wallet — each `walletId` becomes a distinct on-chain contributor):
```
curl -X POST http://localhost:3000/api/pools/<pool-id>/contribute -H "Content-Type: application/json" -d "{\"walletId\":\"699d7c8f-2f9e-5a74-83d1-f6054bf376c6\",\"amount\":\"0.3\"}"
```

**4a. Release path** — once `current_amount >= targetAmount`:
```
curl -X POST http://localhost:3000/api/pools/<pool-id>/check-release -H "Content-Type: application/json" -d "{\"walletId\":\"699d7c8f-2f9e-5a74-83d1-f6054bf376c6\"}"
```
Expect `{"status":"released","finalValue":"...","txHash":"0x..."}` — the recipient wallet's balance should jump by exactly `finalValue`.

**4b. Refund path** — instead, create a pool with a short deadline (a minute or two out) and contribute under target; once the deadline passes, call the same `check-release` endpoint (expect `"status":"refunded"`), then each contributor claims their own share:
```
curl -X POST http://localhost:3000/api/pools/<pool-id>/refund -H "Content-Type: application/json" -d "{\"walletId\":\"<their-wallet-id>\"}"
```
Expect `refundedAmount` slightly above their original contribution (their share of accrued yield).

**Extras**: `npm run contracts:read-pool-escrow` / `contracts:read-yield-vault` to sanity-check on-chain state directly; `npm run contracts:fund-vault-reserve -- <walletId> <amount>` if a release/refund ever reverts with `"withdraw failed"` (means the vault's simulated yield needs a real top-up to actually pay out — see Step 6.5 gotcha below).

## Environment gotchas (read this before debugging anything that "doesn't work")

- **`ComSpec` is unset in shell sessions on this machine.** Any `npm install` or `npm run <script>` can fail — `npm run` fails **completely silently** (no error text, just exits) which looks exactly like a hang. Fix: `$env:ComSpec = "C:\Windows\System32\cmd.exe"` once per terminal session before running npm. Full details: `.claude` memory file `npm_comspec_fix.md` (or just always set this first).
- **This machine's filesystem/AV is slow.** `next dev` first-compiles of a route have taken anywhere from 2 to 30 minutes. Not a bug — just wait it out. The dev server can also OOM-crash on a long session (`JavaScript heap out of memory`); if so just `npm run dev` again.
- **Browser wallet extensions** (MetaMask etc.) can throw `Cannot redefine property: ethereum` in the console — harmless, unrelated to our code. Test passkey flows in an Incognito window with extensions off if it's noisy.
- Circle's programmatic faucet API (`requestTestnetTokens`) 403s unless the Circle account has completed mainnet verification (free, quick). Workaround: use the web faucet UI at console.circle.com or faucet-v2.circle.com directly.

## Key architectural decisions made along the way

- **Two separate wallet systems, both on the `users` table:**
  - `circle_wallet_id` / `circle_wallet_address` — Step 3, Developer-Controlled (server-custodied via entity secret), EOA by default.
  - `passkey_credential_id` / `modular_wallet_address` — Step 4, Circle Modular Wallets (self-custodial smart account, owner = passkey). **A passkey login does not unlock the Step 3 wallet — these are unrelated wallets on the same user row.**
  - Step 5's test wallets are a *third* set (SCA type, required for Gas Station sponsorship), created ad hoc via `circle:create-test-wallets`, not tied to the `users` table at all — they're throwaway test fixtures.
- **Arc's native currency is USDC itself** (18 decimals at the protocol level, per viem's built-in `arcTestnet` chain def — chain id `5042002`). This means:
  - Step 5 transfers are native-value transfers, not ERC-20 `transferFrom` — Circle's API 404'd when we tried referencing the USDC contract address as a token.
  - Step 6's `PoolEscrow.sol` uses `payable`/`msg.value` for contributions, not ERC-20 calls. Simpler, and matches how Arc actually works.
- **Auth session (Step 4) is intentionally minimal**: a plain `harambee_session` cookie holding just the user id, no JWT/expiry. Fine for a hackathon demo, explicitly not production-grade.
- **Migrations are applied by hand** (paste into Supabase SQL Editor), not via Supabase CLI — avoids a Docker/CLI-link dependency for speed.
- **Circle Contracts read calls need `abiJson` passed explicitly** even when the contract is already deployed/known to Circle — `abiFunctionSignature` alone only encodes call *inputs*; without the full ABI, Circle can't decode the *outputs* and silently returns `outputValues: null` (raw `outputData` is still correct).

## Step-by-step status

### Step 1 — Scaffolding ✅
Next.js 16 + TypeScript + Tailwind, App Router. `lib/`, `components/`, `app/` folders. `.env.local.example` covers every env var across all steps with source comments. Custom navy "H" logo/favicon (`app/icon.png`, shown on homepage).

### Step 2 — Database schema ✅
Supabase tables via `supabase/migrations/0001_init.sql`: `users`, `pools`, `pool_contributions`. `lib/supabase.ts` (service-role client). Test script: `npm run test:db`.

Schema defaults chosen (flagged, not confirmed/changed by user): `pools.release_mode` enum, `pools.status` enum, `numeric(18,6)` amounts, nullable `pool_contributions.contributor_id`.

### Step 3 — Circle Developer-Controlled Wallets ✅
`lib/circle.ts` (client factory). One-time setup scripts: `npm run circle:register-entity-secret`, `npm run circle:create-wallet-set` (save `CIRCLE_ENTITY_SECRET` / `CIRCLE_WALLET_SET_ID` to `.env.local` from their output). `POST /api/wallets` route: creates an EOA wallet on `ARC-TESTNET` for a given `userId`, stores id+address on the user row. Confirmed: real wallet created, address stored.

### Step 4 — Passkey / Modular Wallets auth ✅
`supabase/migrations/0002_add_passkey_wallet.sql` adds the passkey columns. `lib/modularWallet.ts` (browser-only, uses `@circle-fin/modular-wallets-core` + viem — `toPasskeyTransport`/`toModularTransport` take positional `(clientUrl, clientKey)` args, not an object; chain-URL suffix is `/arcTestnet`). Routes: `/api/auth/register`, `/login`, `/logout`. Pages: `/register`, `/login`, `/account` (server component reads the session cookie).

Setup needed once: Circle Console → API & Client Keys → Client Key, **Web Allowed Domain = `localhost`**. Separately, Console → Wallets → Modular Wallets → Passkey → **Domain Name must also be set to `localhost`** (a distinct setting from the Client Key's allowed domain — missing this produced a `Cannot find the entity config in the system` error). Confirmed working end to end: register → logout → login → same wallet address.

### Step 5 — Gas Station sponsored transfer ✅
`npm run circle:create-test-wallets` (2 SCA wallets — SCA is required for Gas Station sponsorship, unlike Step 3's EOA), `npm run circle:fund-test-wallet -- <address>` (or use the web faucet UI). `POST /api/gas-station/test-transfer` route sends a native-value transfer wallet A → B with no explicit Gas Station policy ID needed (Circle auto-provisions a default testnet sponsorship policy). Confirmed: `state: "COMPLETE"`, real txHash, settled on ArcScan, no separate gas deducted.

### Step 6 — Pool escrow contract ✅
`contracts/PoolEscrow.sol`: `createPool`, `contribute` (payable), `checkAndRelease` (threshold-or-deadline), `refund` (pull-based per contributor), `getPool` (read). Compiled via `solc` directly (`npm run contracts:compile-pool-escrow` → `contracts/artifacts/PoolEscrow.json`). Deployed via Circle Contracts SDK (`lib/circleContracts.ts`, `npm run contracts:deploy-pool-escrow -- <deployer-wallet-id>` — needs a wallet **id** not address, e.g. Wallet A from Step 5). Address saved to `.env.local` as `POOL_ESCROW_CONTRACT_ADDRESS` and to `contracts/artifacts/PoolEscrow.deployment.json`. Read-verified via `npm run contracts:read-pool-escrow` → confirmed `getPool(0)` returns a correctly-decoded zeroed 5-tuple.

### Step 6.5 — Yield vault ✅
`contracts/YieldVault.sol`: positions keyed by `poolId` (not depositor address), `deposit(poolId)` (payable, `onlyPoolEscrow`), `withdrawAll(poolId)` (`onlyPoolEscrow`, returns principal+yield in one shot), `getAccruedYield(poolId)`/`getPrincipal(poolId)` (views), fixed 5% `APY_BPS` linear interest off `block.timestamp` elapsed since last checkpoint. Stands in for **Morpho** (closest structural match: simple deposit/withdraw/accrue vault, vs. Aave's pooled-liquidity model).

`PoolEscrow.sol` updated: constructor now takes `address _vault`; `contribute()` forwards `msg.value` into `IYieldVault(vault).deposit(poolId)`; `checkAndRelease()` calls `vault.withdrawAll(poolId)` and either sends the full principal+yield to the recipient (release) or freezes it as `pool.finalValue` for proportional refund splitting; `refund()` now pays `principal * finalValue / currentAmount` (currentAmount = frozen total original principal) instead of just principal. `getPool` return tuple grew from 5 to 6 fields (added `finalValue`).

**Important real-world gotcha**: the vault's simulated APY isn't backed by real incoming value — depositing 100 USDC only puts 100 real USDC in the contract, but the accounting ledger grows beyond that via invented interest. `withdrawAll` will revert on insufficient balance unless the vault's reserve is topped up first via `fundReserve()` (payable, permissionless). **Nobody has funded the deployed vault's reserve yet** — Step 8's release/refund testing will hit this and need `fundReserve()` called first with enough native currency to cover whatever yield accrues by then.

**Ownership gotcha**: `YieldVault`'s constructor takes an explicit `address _owner` param rather than using `msg.sender` — for SCA wallets (which Wallet A is), the deploy transaction's `msg.sender` as seen by the constructor is a Circle-managed deployer address, not the wallet's own address. `deploy-yield-vault.ts` resolves the wallet's real address via `lib/circle.ts`'s `getWallet` before deploying, specifically to work around this.

**Circle API gotcha**: the `description` field in `deployContract` must be alphanumeric-only (spaces ok) — parentheses/hyphens in a description produce a 400 `API parameter invalid` with no useful top-level message; the real reason is in the error's nested `errors[0].message`, not the top-level `message`.

Deploy sequence (all via `.env.local`-driven scripts, only `walletId` needed as an arg): `contracts:compile-yield-vault` → `contracts:deploy-yield-vault -- <walletId>` (writes `YIELD_VAULT_CONTRACT_ADDRESS`) → `contracts:compile-pool-escrow` → `contracts:deploy-pool-escrow -- <walletId>` (reads vault address from env, writes `POOL_ESCROW_CONTRACT_ADDRESS` — this redeploys escrow with new bytecode/constructor, got a new address vs. Step 6) → `contracts:wire-vault -- <walletId>` (calls `setPoolEscrow` on the vault via the developer-controlled-wallets client, not smart-contract-platform — that's where `createContractExecutionTransaction` lives). New helper: `circle:list-wallets` (prints id/address/accountType for every wallet in `CIRCLE_WALLET_SET_ID` — handy since wallet ids are otherwise only ever printed once at creation time and not persisted anywhere).

Testing: fast-forwarded-time test lives in `test/YieldVault.test.ts`, run via `npm run test:yield-vault` (Hardhat, dev-only, not used for the real deploy). **Pin `hardhat@^2.x` + `@nomicfoundation/hardhat-toolbox@^6.x` together** — installing both at `latest` resolves to Hardhat 3 + a toolbox version that works with neither Hardhat 2 nor 3 (a broken combo, confirmed via the CLI's own warning). Hardhat 2 is plain CommonJS, no `"type": "module"` needed. Import `time` from `@nomicfoundation/hardhat-network-helpers` directly, not `@nomicfoundation/hardhat-toolbox/network-helpers` (that subpath doesn't resolve under CJS). Use `import hre from "hardhat"` (default export) + `hre.ethers`, not named imports. Root `tsconfig.json` `target` bumped from `ES2017` to `ES2020` to support BigInt literals (`0n` etc.) used in the test — safe, doesn't affect the Next.js app's runtime (SWC/Turbopack handle that independently of `tsc`'s target).

Confirmed working: both Hardhat tests pass (linear interest matches the formula exactly; `withdrawAll` correctly checkpoints and pays out principal+yield). Both contracts deployed to Arc testnet, wired, and read-verified — `getPrincipal(0)`/`getAccruedYield(0)` both `0` (no pool has contributed yet), `getPool(0)` returns a correctly-decoded zeroed 6-tuple.

### Step 7 — Contribute-to-pool flow ✅
`POST /api/pools` — snapshots the contract's `nextPoolId` before calling `createPool` on-chain (avoids needing to decode event logs to learn the assigned id), then inserts the Supabase row with that real `onchain_pool_id` already attached. `POST /api/pools/[id]/contribute` — calls `contribute` on-chain from whichever `walletId` is given (its address becomes the on-chain contributor — deliberately decoupled from `contributorId`, which is optional and purely for Supabase bookkeeping), then re-reads `getPool` from the contract and writes that authoritative `current_amount` into Supabase rather than doing arithmetic in JS. `lib/poolEscrow.ts` — shared ABI/address helper, reused by Step 8's routes too.

**Contributors in testing = Step 5's wallets, not Step 3/4 user wallets** — flagged/chosen because the contract needs a distinct on-chain `msg.sender` per contributor, and Step 5's SCA test wallets already have proven Gas Station sponsorship working; Step 3 wallets are EOA (no sponsorship) and Step 4's Modular Wallets would need a whole separate client-side bundler/paymaster flow. Real user-wallet integration is a later polish item, not required by this step's test target.

Confirmed working: created a pool, contributed from two distinct wallets (0.3 + 0.2), on-chain `getPool` and Supabase `current_amount` both showed `0.5`, and separately confirmed the vault's `getPrincipal`/`getAccruedYield` proved contributions are auto-forwarded into it (no separate deposit step needed — that's just what `contribute()` already does per Step 6.5).

### Step 8 — Threshold/deadline release and refund ✅
`lib/poolRelease.ts` — `checkAndReleasePool(poolId, onchainPoolId, walletId)`: calls `checkAndRelease` on-chain, re-syncs Supabase (`status`, `current_amount`) from the contract's own post-call state. `POST /api/pools/[id]/check-release` — manual per-pool trigger. `POST /api/cron/check-pools` — the actual **poll** mechanism: queries Supabase for all `status='open'` pools, checks each on-chain (`currentAmount >= targetAmount` or `deadline` passed), and calls `checkAndReleasePool` for any that qualify. In production an external scheduler (Vercel Cron) would hit this on an interval.

**Poll chosen over event-driven**, flagged: an on-chain log subscription needs a long-lived WebSocket connection, and Circle webhooks need a public endpoint + signature verification — both awkward fits for serverless deployment. Polling is stateless/idempotent (a no-op when nothing's changed).

`POST /api/pools/[id]/refund` — takes the contributor's own `walletId` (required, since `refund()`'s `msg.sender` determines both the payout amount *and* destination — this can't be triggered on someone's behalf by a different wallet). Predicts the payout via `contributions(poolId, address) * finalValue / currentAmount` read fresh from the contract (bigint math, no float rounding) before submitting, so the expected amount is exact. Deliberately does **not** try to update `pool_contributions` rows on refund (we don't track wallet address there, only optional `contributor_id`) — the verifiable outcome is the on-chain balance change, checked directly, not an off-chain ledger row. Documented simplification for Step 10.

**Real bug found and fixed during testing**: `checkAndRelease` reverted with `"withdraw failed"` every time. Root cause — `YieldVault.withdrawAll()` sends funds back to `PoolEscrow` via a bare `.call{value: total}("")` (empty calldata), but `PoolEscrow.sol` had **no `receive()` function** — a contract without one rejects plain value transfers outright, even if it has other payable functions like `contribute()`. First suspected it was the [vault-reserve-funding gotcha](#step-65--yield-vault-) instead (added `contracts:fund-vault-reserve -- <walletId> <amount>` script for that, which is still useful/needed) — that was a real but *different* problem; fixing it alone didn't resolve this one. Fix: added `receive() external payable {}` to `PoolEscrow.sol`.

Fixing this required a full redeploy of **both** contracts (a new `PoolEscrow` needs new bytecode; `YieldVault.setPoolEscrow` was write-once so a stuck vault would've needed redeploying too — changed it to be freely re-settable by the owner at any time, so a future `PoolEscrow`-only fix won't force a vault redeploy again). **This orphaned the Step 7 test pool** (Supabase row `994a2185-eb56-4a40-961f-f2d47cee35ca`, on-chain pool 0 in the *old*, now-abandoned `PoolEscrow` deployment) — its on-chain state is stale/unreachable through the app now that `POOL_ESCROW_CONTRACT_ADDRESS` points elsewhere; harmless testnet funds, just ignore that row going forward. New contract addresses are current in `.env.local`.

Confirmed working, both scenarios, on the redeployed contracts:
- **Release**: pool created, contributed over target from two wallets (total `1.1`), `check-release` returned `{"status":"released","finalValue":"1.100001945713460469",...}`, and the recipient wallet's actual balance increase was verified on ArcScan (its "Internal Transactions" tab, not the regular "Transactions" tab — SCA wallets show `0` transaction count on explorers since they don't originate top-level transactions the traditional way; the incoming value shows as an internal transfer/delegatecall instead, but the balance still lands on the wallet's own address, not the delegatecall target).
- **Refund**: pool created with a short deadline, contributed under target (`0.8` total vs. `5` target), waited for the deadline, `check-release` returned `{"status":"refunded","finalValue":"0.800000767059886742",...}`, and both wallets successfully called `/refund` and received their principal + proportional yield share back.

One new gotcha hit mid-testing: after redeploying a *fresh* `YieldVault`, its reserve was empty again (the fund-vault-reserve fix from Step 6.5 was for the old, now-abandoned vault) — hit `"withdraw failed"` again for this reason specifically (not the `receive()` bug, which was already fixed) until `contracts:fund-vault-reserve` was run again against the new vault address. **Any time either contract gets redeployed, the new vault needs a fresh `fundReserve()` top-up before release/refund will work.**

A dev-server crash also occurred mid-testing — this one in Next.js's Rust-based compiler (Turbopack/SWC: `Fatal process out of memory: Zone`), distinct from the earlier Node/V8 heap OOM crash from Step 4. Same cause (long-running dev session building up memory pressure on this machine) and same fix (`npm run dev` again).

### Step 9 — Local-currency display at release ✅

**StableFX was investigated in depth and ruled out** — it's not a fiat-conversion API at all. Per Circle's own docs (`developers.circle.com/stablefx/*`):
- It only swaps **USDC↔EURC** — no NGN/KES/GHS or any fiat currency appears anywhere in its supported-currencies list.
- It's an **institutional RFQ trading venue**, not a quote lookup: requires KYB onboarding ("contact your Circle representative"), and every trade needs an **approved maker** (liquidity provider) to counter-sign via a `FxEscrow` contract (Permit2 + EIP-712), which a hackathon account has no access to.

Also investigated as an alternative: Circle's **Digital Asset Accounts wire deposits/withdrawals** (a real fiat off-ramp) and third-party African off-ramp APIs (**Kotani Pay** — strongest fit, real sandbox, `/offramp/create` endpoint, mobile money + bank payout; also Yellow Card, Ivorypay, LocalRamp, Breet, Paychant). Both ruled out for the same underlying reason: Circle's wire product is **USD-only, US banking rails only**, gated behind a compliance-reviewed business account; and **no third-party off-ramp supports Arc** (public testnet only since Oct 2025, mainnet still rolling out in 2026) — they all integrate with established chains (Ethereum, Polygon, Celo, Tron, Solana, BSC). Bridging testnet funds off Arc wouldn't help either, since off-ramps pay real fiat for real USDC, not testnet tokens. **Conclusion: no path from Arc-testnet USDC to a real bank-account payout exists at our account tier, for any vendor** — a genuine platform-maturity limitation, not a shortcut.

Given that, Step 9 is a **display-only stub**: at release time, if a pool has an optional `target_currency` set, its released USDC amount is converted to that currency using a live rate from a free public rate feed (`open.er-api.com`, no API key), and shown alongside the real on-chain `finalValue`. **This does not move any real fiat currency** — it's an informational number only, same demo pattern as the YieldVault standing in for Morpho.

Implementation:
- `supabase/migrations/0003_add_target_currency.sql` — adds `pools.target_currency` (nullable text), `pools.local_currency_amount`, `pools.fx_rate`. **Not yet applied — run this in Supabase SQL Editor before testing.**
- `lib/localFx.ts` — `convertUsdcToLocal(amountUsdc, targetCurrency)`, fetches `open.er-api.com/v6/latest/USD`, treats 1 USDC = 1 USD (its actual peg).
- `POST /api/pools` — accepts optional `targetCurrency` (e.g. `"NGN"`), stored on the pool row.
- `lib/poolRelease.ts`'s `checkAndReleasePool` — takes optional 4th param `targetCurrency`; on a successful release (not refund — refund has no single recipient amount), computes and persists `local_currency_amount`/`fx_rate`, and includes `localCurrencyAmount`/`targetCurrency`/`fxRate` in the response. Conversion failure is caught and swallowed (logged, not thrown) — a rate-feed hiccup shouldn't undo an on-chain release that already succeeded.
- Both callers (`check-release` and `cron/check-pools` routes) pass `pool.target_currency` through.

Confirmed working: created a pool with `targetCurrency: "NGN"`, contributed to target, called `check-release` — response came back `{"status":"released","finalValue":"0.10000001870877727","txHash":"0x...","localCurrencyAmount":"136.83","targetCurrency":"NGN","fxRate":1368.257472}`. Live rate, correct math, alongside the real on-chain USDC settlement.

### Web UI — create / share / contribute / auto-release ✅ (built, needs end-to-end browser test)

Steps 1–9 were only ever exercised via curl. Since judges will test the product themselves in real time, this phase adds the actual pages: create a pool, get a shareable link, contribute with your own passkey wallet, and watch it auto-release.

**Two architectural decisions:**
- **Contribute (and refund) are passkey-signed from the browser** — a real ERC-4337 sponsored transaction via `viem`'s `account-abstraction` module + Circle's `toModularTransport` (which doubles as bundler *and* paymaster/Gas Station endpoint). No new npm packages were needed, but this is genuinely new/first-time-tested surface area: `lib/modularWallet.ts` previously only ever derived a wallet **address** for auth/display, never a signable account — `lib/poolContribute.ts` is new, keeps the `SmartAccount` object alive, and calls `createBundlerClient(...).sendUserOperation(...)`.
- **Pool creation and release-checking stay server-side**, submitted through one dedicated "platform wallet" (`HARAMBEE_PLATFORM_WALLET_ID` env var, defaults to Wallet A) — reusing the exact path proven in Steps 6–9. Only `contribute()`/`refund()` go through the visitor's own wallet, since `msg.sender` there determines the on-chain bookkeeping; `createPool`/`checkAndRelease` don't care who submits them.

**Live-demo prerequisite**: a freshly-registered passkey wallet has no testnet USDC — Arc's native currency *is* USDC, so `contribute()` sends real value, not just gas (Gas Station only sponsors gas). `/account` now shows a direct faucet link (`faucet-v2.circle.com`) next to the wallet address.

**New/changed files:**
- `lib/platformWallet.ts`, `lib/poolSync.ts` (shared "read on-chain state, sync Supabase, release if conditions met" logic, extracted since both the new sync route and contribute-confirm route need it), `lib/poolContribute.ts` (browser-only passkey signing).
- `app/api/pools/route.ts` — **breaking change to the curl workflow**: `creatorId` now comes from the `harambee_session` cookie (not a client-supplied field — closes a real trust gap), and `walletId` is no longer a request field (uses the platform wallet instead). `recipientWalletAddress` is now optional (defaults to the creator's own wallet).
- New `app/api/pools/[id]/sync/route.ts` (polled by the pool detail page) and `app/api/pools/[id]/contribute/confirm/route.ts` (called after a passkey-signed contribute succeeds on-chain, logs the real `contributor_id` — no longer always null like the curl-testing path).
- New pages: `app/pools/new/page.tsx` (create form), `app/pools/[id]/page.tsx` + `components/PoolDetail.tsx` (share/contribute/status page, polls every 4s while open so deadline-based releases happen without a manual trigger even if no one contributes again). Extended `app/account/page.tsx` with a "My pools" list (created + contributed-to). Added `?next=` redirect support to `/register`/`/login` so contributing while logged out round-trips back to the pool page. `components/Button.tsx`/`TextInput.tsx` — small shared primitives (first ones in the previously-empty `components/` folder).

**Not yet tested end-to-end in a real browser** — needs: register a fresh passkey, fund it via the faucet, create a pool, contribute from the pool page (passkey prompt), confirm it renders the release + local-currency amount, and separately confirm a short-deadline under-target pool refunds and can be claimed.

### Step 10 — not started
Wrap-up summary — what's real vs stubbed/faked for the demo. Belongs on this list: the yield vault's fixed/invented APY (not a real market rate, needs manual `fundReserve()` top-ups to actually pay out), the orphaned Step 7 test pool, the lack of per-refund `pool_contributions` bookkeeping, and Step 9's local-currency display being informational-only (no real off-ramp exists at our account tier — see Step 9 above for the full StableFX/off-ramp investigation).

## Env vars currently populated (see `.env.local.example` for the full list + where to get each)
Done: Supabase (URL/anon/service-role), `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CIRCLE_WALLET_SET_ID`, `NEXT_PUBLIC_CIRCLE_CLIENT_KEY`, `NEXT_PUBLIC_CIRCLE_CLIENT_URL`, Arc RPC/chain-id/explorer, `POOL_ESCROW_CONTRACT_ADDRESS`, `YIELD_VAULT_CONTRACT_ADDRESS`.
Still empty: `CIRCLE_GAS_STATION_POLICY_ID` (not needed — see Step 5 notes), `ARC_TESTNET_USDC_ADDRESS` (has a default value, but turned out to be unused since native-value transfers are used instead), `CIRCLE_STABLEFX_API_KEY`.
