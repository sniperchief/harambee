"use client";

import { useCallback, useEffect, useState } from "react";

// Client hook: fetches the logged-in user's spendable USDC balance and exposes
// a refresh() to re-read it (e.g. after a contribution). balance is null while
// loading or if the read failed.
export function useWalletBalance() {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/wallet/balance");
      if (r.ok) {
        const body = await r.json();
        setBalance(body.balance ?? null);
      }
    } catch {
      // Leave balance as-is; UI shows "—".
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balance, loading, refresh };
}
