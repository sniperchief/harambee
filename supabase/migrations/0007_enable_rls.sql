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
