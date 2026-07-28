import { NextRequest, NextResponse } from "next/server";
import { verify, type WebAuthnData } from "webauthn-p256";
import { createServiceClient } from "@/lib/supabase";
import { consumeChallenge } from "@/lib/authChallenge";
import { sessionCookieOptions } from "@/lib/authCookie";

// Server-verified passkey login. The client fetches a challenge from
// /api/auth/challenge, signs it with its passkey, and posts the signature
// here. We look up the account by credential id, then cryptographically
// verify the signature against that credential's stored public key. Only a
// real signature over a fresh, server-issued challenge yields a session — a
// known wallet address alone proves nothing.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    credentialId?: string;
    challenge?: string;
    signature?: `0x${string}`;
    webauthn?: WebAuthnData;
  };
  const { credentialId, challenge, signature, webauthn } = body;

  if (!credentialId || !challenge || !signature || !webauthn) {
    return NextResponse.json(
      { error: "credentialId, challenge, signature and webauthn are required" },
      { status: 400 }
    );
  }

  // Single-use, unexpired challenge. Consumed here so it can't be replayed.
  const fresh = await consumeChallenge(challenge);
  if (!fresh) {
    return NextResponse.json(
      { error: "Login challenge expired — please try again." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select()
    .eq("passkey_credential_id", credentialId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "No account for this passkey" }, { status: 404 });
  }
  if (!user.passkey_public_key) {
    // Legacy account created before server-side verification existed.
    return NextResponse.json(
      { error: "This account predates secure sign-in. Please register again." },
      { status: 409 }
    );
  }

  const valid = await verify({
    hash: challenge as `0x${string}`,
    publicKey: user.passkey_public_key as `0x${string}`,
    signature,
    webauthn,
  });

  if (!valid) {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 401 });
  }

  const response = NextResponse.json({ userId: user.id, address: user.modular_wallet_address });
  response.cookies.set("harambee_session", user.id, sessionCookieOptions());
  return response;
}
