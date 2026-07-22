-- Adds passkey-controlled Circle Modular Wallet fields to users.
-- This is a distinct wallet from circle_wallet_address (Step 3's
-- Developer-Controlled Wallet) — a passkey login controls its own
-- self-custodial smart account, it does not unlock the Step 3 wallet.
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

alter table users
  add column if not exists passkey_credential_id text unique,
  add column if not exists modular_wallet_address text unique;
