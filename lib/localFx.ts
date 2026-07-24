// Local-currency display for released pools (Step 9). Stands in for Circle
// StableFX — StableFX turned out to only swap USDC<->EURC between
// KYB-onboarded institutional counterparties, with no fiat leg at all, so it
// can't produce a NGN/KES/GHS amount. This instead pulls a live USD rate
// from a free public rate feed (USDC treated as 1:1 USD, its actual peg) and
// is display-only: it does not move real fiat anywhere.
const RATE_API_URL = "https://open.er-api.com/v6/latest/USD";

export async function convertUsdcToLocal(
  amountUsdc: string,
  targetCurrency: string
): Promise<{ rate: number; localAmount: string }> {
  const response = await fetch(RATE_API_URL);
  if (!response.ok) {
    throw new Error(`FX rate lookup failed: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.rates?.[targetCurrency];
  if (!rate) {
    throw new Error(`No FX rate available for currency "${targetCurrency}"`);
  }

  const localAmount = (Number(amountUsdc) * rate).toFixed(2);
  return { rate, localAmount };
}
