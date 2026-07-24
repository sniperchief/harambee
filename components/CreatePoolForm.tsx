"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";

const CURRENCIES = ["NGN", "KES", "GHS", "USD", "GBP", "EUR", "ZAR"];

export function CreatePoolForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [recipientWalletAddress, setRecipientWalletAddress] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMessage("");
    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          targetAmount,
          deadline: new Date(deadline).toISOString(),
          recipientWalletAddress: recipientWalletAddress || undefined,
          targetCurrency: targetCurrency || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to create pool");
      }
      router.push(`/pools/${body.pool.id}`);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create pool");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
      <TextInput
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <TextInput
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <TextInput
        type="number"
        step="0.000001"
        min="0"
        placeholder="Target amount (USDC)"
        value={targetAmount}
        onChange={(e) => setTargetAmount(e.target.value)}
        required
      />
      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        Deadline
        <TextInput
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
          className="mt-1"
        />
      </label>
      <TextInput
        placeholder="Recipient wallet address (leave blank for yourself)"
        value={recipientWalletAddress}
        onChange={(e) => setRecipientWalletAddress(e.target.value)}
      />
      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        Show local-currency value at release (optional)
        <select
          value={targetCurrency}
          onChange={(e) => setTargetCurrency(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">None</option>
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={status === "working"}>
        {status === "working" ? "Creating..." : "Create pool"}
      </Button>
      {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
    </form>
  );
}
