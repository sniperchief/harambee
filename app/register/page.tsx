"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { registerPasskey } from "@/lib/modularWallet";

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/account";
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister() {
    setStatus("working");
    setErrorMessage("");
    try {
      const { credentialId, address } = await registerPasskey(username);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, address }),
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Register with a passkey
      </h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-64 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <button
        onClick={handleRegister}
        disabled={!username || status === "working"}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status === "working" ? "Registering..." : "Register passkey"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <a href={`/login?next=${encodeURIComponent(next)}`} className="text-sm text-zinc-500 underline">
        Already have a passkey? Log in
      </a>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
