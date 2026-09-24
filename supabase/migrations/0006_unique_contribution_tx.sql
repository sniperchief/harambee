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
