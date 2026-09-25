import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { SESSION_COOKIE, createSessionValue, sessionCookieOptions } from "@/lib/authCookie";
import { isValidUsername, normalizeUsername } from "@/lib/username";

// "That column doesn't exist" — the 0008_add_username migration isn't applied yet.
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

export async function POST(request: NextRequest) {
  const { credentialId, address, publicKey, username: rawUsername } = await request.json();
  const username = normalizeUsername(rawUsername);

  if (!credentialId || !address || !publicKey) {
    return NextResponse.json(
      { error: "credentialId, address and publicKey are required" },
      { status: 400 }
    );
  }

  if (username && !isValidUsername(username)) {
    return NextResponse.json({ error: "That username isn't valid." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const base = {
    passkey_credential_id: credentialId,
    modular_wallet_address: address,
    passkey_public_key: publicKey,
  };
  const row: Record<string, string> = username ? { ...base, username } : { ...base };
  let { data: user, error } = await supabase.from("users").insert(row).select().single();

  // Database not migrated yet: create the account without a username rather
  // than failing sign-up. The user can add one later in Settings.
  if (error && username && MISSING_COLUMN.has(error.code ?? "")) {
    ({ data: user, error } = await supabase.from("users").insert(base).select().single());
  }

  if (error || !user) {
    if (error?.code === "23505" && /username/i.test(`${error.message} ${error.details ?? ""}`)) {
      return NextResponse.json({ error: "That username was just taken — please choose another." }, { status: 409 });
    }
    // Unique-violation: this passkey/wallet is already registered.
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "You already have an account. Please sign in instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error?.message ?? "Registration failed" }, { status: 500 });
  }

  const response = NextResponse.json({ userId: user.id, address });
  response.cookies.set(SESSION_COOKIE, createSessionValue(user.id), sessionCookieOptions());
  return response;
}
