import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase";

async function main() {
  const supabase = createServiceClient();

  const { data: user, error: insertError } = await supabase
    .from("users")
    .insert({ email: `test-${Date.now()}@example.com` })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }
  console.log("Inserted user:", user);

  const { data: fetched, error: fetchError } = await supabase
    .from("users")
    .select()
    .eq("id", user.id)
    .single();

  if (fetchError) {
    throw fetchError;
  }
  console.log("Fetched back:", fetched);
}

main().catch((err) => {
  console.error("test-db failed:", err);
  process.exit(1);
});
