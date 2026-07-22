"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginPasskey } from "@/lib/modularWallet";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setStatus("working");
    setErrorMessage("");
    try {
      const { address } = await loginPasskey();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Login failed");
      }
      router.push("/account");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Log in with your passkey
      </h1>
      <button
        onClick={handleLogin}
        disabled={status === "working"}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status === "working" ? "Logging in..." : "Log in with passkey"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <a href="/register" className="text-sm text-zinc-500 underline">
        No passkey yet? Register
      </a>
    </div>
  );
}
