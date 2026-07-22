import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { credentialId, address } = await request.json();

  if (!credentialId || !address) {
    return NextResponse.json(
      { error: "credentialId and address are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      passkey_credential_id: credentialId,
      modular_wallet_address: address,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ userId: user.id, address });
  response.cookies.set("harambee_session", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
