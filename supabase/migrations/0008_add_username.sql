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
