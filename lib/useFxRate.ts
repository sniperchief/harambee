"use client";

import { useEffect, useState } from "react";

// Live USD→currency rates for display only (same public feed lib/localFx.ts
// uses server-side at release). USDC is treated 1:1 with USD.
const RATE_API_URL = "https://open.er-api.com/v6/latest/USD";

// Module-level cache + in-flight dedup, so a page full of pool cards shares a
// single request for the whole rate table rather than one per card.
let cached: Record<string, number> | null = null;
let inflight: Promise<Record<string, number>> | null = null;

function loadRates(): Promise<Record<string, number>> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch(RATE_API_URL)
      .then((r) => r.json())
      .then((d) => {
        cached = (d?.rates as Record<string, number>) ?? {};
        return cached;
      })
      .catch(() => {
        inflight = null; // let a later mount retry
        return {} as Record<string, number>;
      });
  }
  return inflight;
}

// Returns 1 for USD, the live rate for a known currency, or null while loading
// or if the currency is unknown — callers hide the converted figure on null so
// an unconverted number is never shown.
export function useFxRate(code: string | null | undefined): number | null {
  // The last lookup, tagged with its currency so a stale rate is never shown
  // for a different code while the new one loads.
  const [fetched, setFetched] = useState<{ code: string; rate: number | null } | null>(null);

  useEffect(() => {
    if (!code || code === "USD") return;
    let active = true;
    loadRates().then((rates) => {
      if (active) setFetched({ code, rate: rates[code] ?? null });
    });
    return () => {
      active = false;
    };
  }, [code]);

  if (!code) return null;
  if (code === "USD") return 1;
  return fetched?.code === code ? fetched.rate : null;
}
