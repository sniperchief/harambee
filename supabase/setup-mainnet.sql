-- Harambee: full database setup for a NEW (mainnet) Supabase project.
-- Generated from migrations/0001..0007 in order. Paste into SQL Editor and Run once.

-- ============================================================
-- migrations/0001_init.sql
-- ============================================================
-- Harambee initial schema: users, pools, pool_contributions
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  circle_wallet_id text,
  circle_wallet_address text,
  created_at timestamptz not null default now()
);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references users(id),
  title text not null,
  description text,
  target_amount numeric(18, 6) not null,
  current_amount numeric(18, 6) not null default 0,
  deadline timestamptz not null,
  release_mode text not null default 'threshold_or_deadline'
    check (release_mode in ('threshold_or_deadline', 'threshold_only', 'deadline_only')),
  status text not null default 'open'
    check (status in ('open', 'released', 'refunded', 'cancelled')),
  recipient_wallet_address text not null,
  onchain_pool_id text,
  created_at timestamptz not null default now()
);

create table if not exists pool_contributions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  contributor_id uuid references users(id),
  amount numeric(18, 6) not null,
  tx_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists pool_contributions_pool_id_idx on pool_contributions(pool_id);
create index if not exists pools_creator_id_idx on pools(creator_id);

-- ============================================================
-- migrations/0002_add_passkey_wallet.sql
-- ============================================================
-- Adds passkey-controlled Circle Modular Wallet fields to users.
-- This is a distinct wallet from circle_wallet_address (Step 3's
-- Developer-Controlled Wallet) — a passkey login controls its own
-- self-custodial smart account, it does not unlock the Step 3 wallet.
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

alter table users
  add column if not exists passkey_credential_id text unique,
  add column if not exists modular_wallet_address text unique;

-- ============================================================
-- migrations/0003_add_target_currency.sql
-- ============================================================
-- Harambee: optional local-currency display at release time (Step 9).
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

alter table pools add column if not exists target_currency text;
alter table pools add column if not exists local_currency_amount numeric(18, 6);
alter table pools add column if not exists fx_rate numeric(18, 8);

-- ============================================================
-- migrations/0004_add_passkey_verification.sql
-- ============================================================
-- Harambee: server-side passkey verification (closes the login bypass).
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).
--
-- Before this change, /api/auth/login trusted a client-supplied wallet address
-- and issued a session for it — a public value, so anyone could impersonate any
-- account. Now the server issues a one-time challenge, the browser signs it with
-- the passkey, and the server verifies that P256 signature against the credential's
-- stored public key. This requires storing the public key (below) and a short-lived
-- table of outstanding challenges.

-- The credential's P256 public key (hex), captured at registration. Legacy rows
-- created before this migration will be NULL and must re-register to log in.
alter table users add column if not exists passkey_public_key text;

-- One-time login challenges. A row is created when a challenge is issued and
-- deleted the moment it's consumed (or when it ages out).
create table if not exists auth_challenges (
  challenge text primary key,
  created_at timestamptz not null default now()
);

create index if not exists auth_challenges_created_at_idx on auth_challenges(created_at);

-- ============================================================
-- migrations/0005_add_release_tx_hash.sql
-- ============================================================
-- Harambee: store the on-chain release transaction hash so the pool page can
-- link to it on the block explorer (proof the funds actually released).
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

alter table pools add column if not exists release_tx_hash text;

-- ============================================================
-- migrations/0006_unique_contribution_tx.sql
-- ============================================================
-- Harambee: one contribution record per on-chain transaction.
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).
--
-- /api/pools/[id]/contribute/confirm verifies each contribution against the
-- chain before recording it. This index makes the record idempotent too: a
-- retried or replayed request for the same transaction can't count it twice.
-- (No yield-related columns ever existed in the database, so none are dropped.)

create unique index if not exists pool_contributions_tx_hash_key
  on pool_contributions (tx_hash)
  where tx_hash is not null;

-- ============================================================
-- migrations/0007_enable_rls.sql
-- ============================================================
-- Harambee: lock the tables to the server.
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).
--
-- The app only talks to Supabase from the server, with the service_role key,
-- which bypasses Row Level Security. Without RLS, anyone holding the public
-- anon key could read and write these tables directly through Supabase's REST
-- API (insert fake contributions, change a user's wallet address, ...).
-- Enabling RLS with no policies denies the anon/authenticated roles
-- everything, while the server keeps working unchanged.

alter table users enable row level security;
alter table pools enable row level security;
alter table pool_contributions enable row level security;
alter table auth_challenges enable row level security;

-- ============================================================
-- migrations/0008_add_username.sql
-- ============================================================
-- Harambee: store the username people choose at sign-up.
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).
--
-- Until now the username only lived on the passkey (on the user's device), so
-- the app fell back to showing wallet addresses. Usernames are unique
-- regardless of case ("Amara" and "amara" are the same person); existing users
-- start with none and can set one in Settings. Safe to run more than once.

alter table users add column if not exists username text;

create unique index if not exists users_username_lower_key
  on users (lower(username))
  where username is not null;
