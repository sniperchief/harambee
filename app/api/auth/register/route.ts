import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sessionCookieOptions } from "@/lib/authCookie";

export async function POST(request: NextRequest) {
  const { credentialId, address, publicKey } = await request.json();

  if (!credentialId || !address || !publicKey) {
    return NextResponse.json(
      { error: "credentialId, address and publicKey are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      passkey_credential_id: credentialId,
      modular_wallet_address: address,
      passkey_public_key: publicKey,
    })
    .select()
    .single();

  if (error) {
    // Unique-violation: this passkey/wallet is already registered.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already have an account. Please sign in instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ userId: user.id, address });
  response.cookies.set("harambee_session", user.id, sessionCookieOptions());
  return response;
}
