// Turns raw WebAuthn / Circle / server errors into messages a person can act
// on. `cancelled` means the user simply dismissed the passkey prompt — that's
// a normal choice, not a failure, so callers should show it gently (or not at
// all) rather than as a red error.
export function friendlyPasskeyError(err: unknown): { message: string; cancelled: boolean } {
  const name = err instanceof Error ? err.name : "";
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const has = (re: RegExp) => re.test(raw);

  // User closed / dismissed the passkey sheet, or it timed out.
  if (
    name === "NotAllowedError" ||
    name === "AbortError" ||
    has(/not allowed by the user agent|denied permission|operation (was )?aborted|timed ?out|either timed out or was not allowed/i)
  ) {
    return { cancelled: true, message: "" };
  }

  // A passkey for this already exists on the device.
  if (name === "InvalidStateError" || has(/already (registered|exists)|duplicate|exclude ?credentials/i)) {
    return { cancelled: false, message: "There's already a passkey for this on your device — try signing in instead." };
  }

  // Circle username rule (the form now prevents this, but just in case).
  if (has(/username.*invalid|5 to 50 characters/i)) {
    return { cancelled: false, message: "That username isn't allowed — use 5–50 letters, numbers or _ @ . : + - (no spaces)." };
  }

  // Server: no account for this passkey (login).
  if (has(/no account for this passkey/i)) {
    return { cancelled: false, message: "We couldn't find an account for that passkey. Create one first." };
  }
  if (has(/predates secure sign-in|register again/i)) {
    return { cancelled: false, message: "This account needs to be set up again — please register." };
  }
  if (has(/challenge expired/i)) {
    return { cancelled: false, message: "That took a little too long — please try again." };
  }
  if (has(/verification failed/i)) {
    return { cancelled: false, message: "We couldn't verify that passkey. Please try again." };
  }

  // Circle service / passkey-domain configuration.
  if (has(/relying party|rp id|well-known\/webauthn/i)) {
    return { cancelled: false, message: "Passkeys aren't fully set up for this site yet. Please try again shortly." };
  }
  if (has(/invalid credentials/i)) {
    return { cancelled: false, message: "We couldn't reach the wallet service. Please try again in a moment." };
  }

  return { cancelled: false, message: "Something went wrong. Please try again." };
}
