-- Harambee: store the on-chain release transaction hash so the pool page can
-- link to it on the block explorer (proof the funds actually released).
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

alter table pools add column if not exists release_tx_hash text;
