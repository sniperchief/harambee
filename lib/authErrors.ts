// Runs one step of a sign-in/sign-up flow and, if it fails, tags the error
// with the step's name so technicalDetail() can say where things broke. The
// original error object is rethrown unchanged otherwise (friendlyPasskeyError
// still sees its name/message).
export async function withStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const tagged = err instanceof Error ? err : new Error(String(err));
    (tagged as Error & { step?: string }).step ??= step;
    throw tagged;
  }
}

// A short, technical description of an error for support/debugging: the step
// that failed plus the error chain (viem/Circle errors nest their causes).
// Shown in small print under the friendly message and logged to the console.
export function technicalDetail(err: unknown): string {
  const step = err instanceof Error ? (err as Error & { step?: string }).step : undefined;
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current && depth < 4; depth++) {
    if (current instanceof Error) {
      const e = current as Error & { shortMessage?: string; details?: string };
      const text = [e.shortMessage ?? e.message, e.details].filter(Boolean).join(" — ");
      parts.push(`${e.name}: ${text}`);
      current = e.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  const detail = parts.join(" ← ").replace(/\s+/g, " ");
  const full = step ? `[${step}] ${detail}` : detail;
  return full.length > 400 ? `${full.slice(0, 400)}…` : full;
}

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

  // The transaction reached the chain but the escrow rejected it — no money moved.
  if (has(/transaction reverted/i)) {
    return { cancelled: false, message: "The transaction didn't go through, so no money moved. Please try again." };
  }
  if (has(/couldn't confirm this contribution/i)) {
    return { cancelled: false, message: "We couldn't confirm that contribution on-chain. Refresh the page to see the latest total." };
  }

  return { cancelled: false, message: "Something went wrong. Please try again." };
}
