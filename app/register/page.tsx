"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { registerPasskey } from "@/lib/modularWallet";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

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

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMessage("");
    try {
      const { credentialId, address, publicKey } = await registerPasskey(username);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, address, publicKey }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Registration failed");
      }
      router.push(next);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-navy">Create your account</h1>
        <p className="mt-2 text-[15px] text-muted">
          A passkey and a name — that&apos;s all it takes. Your wallet is created for you.
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-5">
        <Field label="What should we call you?" htmlFor="username" hint="Shown to people you pool with.">
          <Input
            id="username"
            type="text"
            placeholder="e.g. Amara O."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="name"
          />
        </Field>

        <Button type="submit" size="lg" disabled={!username || status === "working"}>
          <FingerprintIcon />
          {status === "working" ? "Creating your passkey…" : "Continue with passkey"}
        </Button>

        {status === "error" && (
          <p className="rounded-[10px] bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger">
            {errorMessage}
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted">
        By continuing you agree that funds are held in smart-contract escrow and released only when a pool&apos;s conditions are met.
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
