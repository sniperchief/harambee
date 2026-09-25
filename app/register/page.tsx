"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { registerPasskey } from "@/lib/modularWallet";
import { friendlyPasskeyError } from "@/lib/authErrors";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PillButton, PillLink } from "@/components/design/PillButton";
import { FieldShell, InputField, FormMessage } from "@/components/design/InputField";
import { isValidUsername } from "@/lib/username";

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Set when the server says the name is taken; cleared as soon as it's edited.
  const [takenMsg, setTakenMsg] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const trimmed = username.trim();
  const usernameValid = isValidUsername(trimmed);

  // Contextual guidance: flag a disallowed character the moment it's typed, but
  // only mention length once the user has left the field (touched) — so we
  // don't scold a username that's simply still being typed toward 5.
  const hasInvalidChar = trimmed.length > 0 && /[^A-Za-z0-9_@.:+-]/.test(trimmed);
  let usernameError: string | undefined;
  if (takenMsg) {
    usernameError = takenMsg;
  } else if (hasInvalidChar) {
    usernameError = "Letters, numbers, dots, dashes and underscores only — no spaces.";
  } else if (touched && trimmed.length > 0 && trimmed.length < 5) {
    usernameError = "Just a bit longer — at least 5 characters.";
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameValid || !agreed) return;
    setStatus("working");
    setErrorMsg(null);

    // Check the name is free BEFORE creating the passkey, so nobody ends up
    // with a passkey on their device but no account. If the check itself
    // can't be reached, carry on — the server re-checks on sign-up.
    try {
      const r = await fetch(`/api/username?u=${encodeURIComponent(trimmed)}`);
      const check = await r.json();
      if (r.ok && check.available === false) {
        setTakenMsg(check.problem ?? "That username is taken — try another.");
        setStatus("idle");
        return;
      }
    } catch {}

    try {
      const { credentialId, address, publicKey } = await registerPasskey(trimmed);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, address, publicKey, username: trimmed }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Registration failed");
      }
      router.push(next);
    } catch (err) {
      const { cancelled, message } = friendlyPasskeyError(err);
      setStatus("idle");
      // Cancelling the passkey prompt is normal — show nothing, just reset.
      if (!cancelled) setErrorMsg(message);
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create account"
      lead="A passkey and a name — that’s all it takes. Your wallet is created for you."
      after={errorMsg && <FormMessage className="mt-6">{errorMsg}</FormMessage>}
    >
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <FieldShell
          label="Choose a username"
          htmlFor="username"
          hint="5–15 characters. Letters and numbers work best."
          error={usernameError}
        >
          <InputField
            id="username"
            aria-invalid={!!usernameError}
            type="text"
            placeholder="e.g. amara_o"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setTakenMsg(null);
            }}
            onBlur={() => setTouched(true)}
            maxLength={15}
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </FieldShell>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-char">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-ink-black"
          />
          <span>
            I agree that funds are held in smart-contract escrow and released only when a pool&apos;s conditions are met.
          </span>
        </label>

        <PillButton
          type="submit"
          disabled={!usernameValid || !agreed || status === "working"}
          block
          className="mt-2 !border-ink-black"
        >
          {status === "working" ? "Creating your passkey…" : "Continue with passkey"}
        </PillButton>
        <PillLink href={`/login?next=${encodeURIComponent(next)}`} variant="outlined" block>
          I already have an account
        </PillLink>
      </form>
      <p className="mt-6 text-center text-sm text-char">
        No passwords. No seed phrases. Nothing leaves your device.
      </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
