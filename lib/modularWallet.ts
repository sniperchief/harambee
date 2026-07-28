import { createPublicClient } from "viem";
import { arcTestnet } from "viem/chains";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { sign, type WebAuthnData } from "webauthn-p256";
import {
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
  toCircleSmartAccount,
  WebAuthnMode,
} from "@circle-fin/modular-wallets-core";

// Browser-only: WebAuthn requires a real window/navigator.credentials context.
function getClients() {
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY!;
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL!;

  const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
  const modularTransport = toModularTransport(
    `${clientUrl}/arcTestnet`,
    clientKey
  );
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: modularTransport,
  });

  return { passkeyTransport, publicClient };
}

async function credentialToAddress(
  credential: Awaited<ReturnType<typeof toWebAuthnCredential>>,
  publicClient: ReturnType<typeof getClients>["publicClient"]
) {
  const owner = toWebAuthnAccount({ credential, rpId: credential.rpId });
  const account = await toCircleSmartAccount({ client: publicClient, owner });
  return { address: account.address, credentialId: credential.id };
}

export async function registerPasskey(username: string) {
  const { passkeyTransport, publicClient } = getClients();
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Register,
    username,
  });
  const { address, credentialId } = await credentialToAddress(credential, publicClient);
  // publicKey is captured so the server can verify future login signatures
  // against it — see lib/authChallenge.ts and /api/auth/login.
  return { address, credentialId, publicKey: credential.publicKey };
}

export type PasskeyAssertion = {
  credentialId: string;
  signature: `0x${string}`;
  webauthn: WebAuthnData;
};

// Discoverable login: prompt the user to pick a passkey and sign the server's
// challenge in a single ceremony (one biometric prompt). The credential id is
// captured from the WebAuthn response so the server knows which account signed.
export async function assertPasskey(challenge: `0x${string}`): Promise<PasskeyAssertion> {
  let credentialId: string | null = null;
  const getFn = async (options?: CredentialRequestOptions) => {
    const cred = await window.navigator.credentials.get(options);
    if (cred) credentialId = cred.id;
    return cred;
  };

  const { signature, webauthn } = await sign({
    hash: challenge,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFn: getFn as any,
  });

  if (!credentialId) throw new Error("No passkey was selected");
  return { credentialId, signature, webauthn };
}

export async function loginPasskey() {
  const { passkeyTransport, publicClient } = getClients();
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login,
  });
  return credentialToAddress(credential, publicClient);
}
