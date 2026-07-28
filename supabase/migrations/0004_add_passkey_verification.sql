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
