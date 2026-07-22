# Harambee — build progress

Group-pooling payments app on Circle's Arc L1. Built in strict, small, confirmed-before-proceeding steps. This file is the handoff doc — if the chat/context resets, read this first, then the numbered steps in the original prompt, to know exactly where things stand.

**Status: Steps 1–6.5 done and confirmed working. Step 7 is next.**

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

### Steps 7–10 — not started
- **Step 7**: wire Steps 2–6.5 together end to end (create pool → Supabase + contract; contribute → Gas Station-sponsored tx + Supabase update). Decision needed/flagged when we get there: webhook vs direct-confirmation for updating Supabase after a contribution.
- **Step 8**: threshold/deadline release + refund logic. Remember to `fundReserve()` the deployed vault before testing this (see gotcha above), or `withdrawAll` will revert. Decision needed: cron/poll vs event-driven trigger.
- **Step 9**: StableFX conversion at release time.
- **Step 10**: wrap-up summary — what's real vs stubbed/faked for the demo. The yield vault's fixed/invented APY (not a real market rate, and requires manual reserve funding to actually pay out) belongs on this list.

## Env vars currently populated (see `.env.local.example` for the full list + where to get each)
Done: Supabase (URL/anon/service-role), `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CIRCLE_WALLET_SET_ID`, `NEXT_PUBLIC_CIRCLE_CLIENT_KEY`, `NEXT_PUBLIC_CIRCLE_CLIENT_URL`, Arc RPC/chain-id/explorer, `POOL_ESCROW_CONTRACT_ADDRESS`, `YIELD_VAULT_CONTRACT_ADDRESS`.
Still empty: `CIRCLE_GAS_STATION_POLICY_ID` (not needed — see Step 5 notes), `ARC_TESTNET_USDC_ADDRESS` (has a default value, but turned out to be unused since native-value transfers are used instead), `CIRCLE_STABLEFX_API_KEY`.
