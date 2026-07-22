import { createPublicClient } from "viem";
import { arcTestnet } from "viem/chains";
import { toWebAuthnAccount } from "viem/account-abstraction";
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
  return credentialToAddress(credential, publicClient);
}

export async function loginPasskey() {
  const { passkeyTransport, publicClient } = getClients();
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login,
  });
  return credentialToAddress(credential, publicClient);
}
