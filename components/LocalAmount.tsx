"use client";

import { formatLocal } from "@/lib/format";
import { useFxRate } from "@/lib/useFxRate";

// Renders a USDC amount converted to a local currency at the live rate (e.g.
// "₦7,540"). Renders nothing until the rate loads or if the currency is
// unknown, so a raw unconverted figure is never shown. Lets a server component
// (e.g. PoolCard) display a live-rate local value without becoming a client
// component itself.
export function LocalAmount({
  value,
  currency,
  prefix = "",
}: {
  value: string | number;
  currency: string | null | undefined;
  prefix?: string;
}) {
  const rate = useFxRate(currency);
  if (!currency || rate === null) return null;
  return (
    <>
      {prefix}
      {formatLocal(Number(value) * rate, currency)}
    </>
  );
}
