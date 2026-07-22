import { createClient } from "@supabase/supabase-js";

// Server-side client using the service role key. Bypasses Row Level Security,
// so this must only ever be imported from server code (API routes, scripts) —
// never from a "use client" component.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(url, serviceRoleKey);
}
