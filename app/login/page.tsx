"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { assertPasskey } from "@/lib/modularWallet";
import { friendlyPasskeyError } from "@/lib/authErrors";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PillButton, PillLink } from "@/components/design/PillButton";
import { FormMessage } from "@/components/design/InputField";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin() {
    setStatus("working");
    setErrorMsg(null);
    try {
      // 1. Get a fresh, single-use challenge from the server.
      const challengeRes = await fetch("/api/auth/challenge");
      const { challenge } = await challengeRes.json();
      if (!challenge) throw new Error("Could not start sign-in");

      // 2. Sign it with the passkey (one biometric prompt).
      const { credentialId, signature, webauthn } = await assertPasskey(challenge);

      // 3. Server verifies the signature before issuing a session.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, challenge, signature, webauthn }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Login failed");
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
      eyebrow="Welcome back"
      title="Sign in"
      lead="Use the passkey saved on this device — Face ID, fingerprint, or your screen lock."
      after={errorMsg && <FormMessage className="mt-6">{errorMsg}</FormMessage>}
    >
      <div className="flex flex-col gap-4">
        <PillButton onClick={handleLogin} disabled={status === "working"} block className="!border-ink-black">
          {status === "working" ? "Verifying…" : "Sign in with passkey"}
        </PillButton>
        <PillLink href={`/register?next=${encodeURIComponent(next)}`} variant="outlined" block>
          Create a new account
        </PillLink>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
