"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { assertPasskey } from "@/lib/modularWallet";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";

function FingerprintIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setStatus("working");
    setErrorMessage("");
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
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-navy">Welcome back</h1>
        <p className="mt-2 text-[15px] text-muted">
          Use the passkey on this device to sign in securely.
        </p>
      </div>

      <Button onClick={handleLogin} size="lg" disabled={status === "working"} className="w-full">
        <FingerprintIcon />
        {status === "working" ? "Verifying…" : "Sign in with passkey"}
      </Button>

      {status === "error" && (
        <p className="mt-4 rounded-[10px] bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 rounded-[12px] border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
        Your passkey never leaves your device. There&apos;s no password to steal and nothing to remember.
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        New to Harambee?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
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
