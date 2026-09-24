"use client";

import { useCallback, useEffect, useState } from "react";

// Client hook: fetches the logged-in user's spendable USDC balance and exposes
// a refresh() to re-read it (e.g. after a contribution). balance is null while
// loading or if the read failed.
// Resolves to the balance, or `undefined` if the read failed (callers then
// leave the current value as-is; the UI shows "—").
async function fetchBalance(): Promise<string | null | undefined> {
  try {
    const r = await fetch("/api/wallet/balance");
    if (!r.ok) return undefined;
    const body = await r.json();
    return body.balance ?? null;
  } catch {
    return undefined;
  }
}

export function useWalletBalance() {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const b = await fetchBalance();
    if (b !== undefined) setBalance(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchBalance().then((b) => {
      if (!active) return;
      if (b !== undefined) setBalance(b);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { balance, loading, refresh };
}
