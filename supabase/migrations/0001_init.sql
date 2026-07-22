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
