-- Harambee: optional local-currency display at release time (Step 9).
-- Apply via Supabase SQL Editor (dashboard > SQL Editor > New query > paste > Run).

alter table pools add column if not exists target_currency text;
alter table pools add column if not exists local_currency_amount numeric(18, 6);
alter table pools add column if not exists fx_rate numeric(18, 8);
