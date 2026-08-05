// Block-explorer (ArcScan) URL helpers for Arc testnet. The base is public and
// fixed, so it's a constant with an optional NEXT_PUBLIC override — no env
// setup required, and it works in both server and client components.
const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_ARC_TESTNET_EXPLORER_URL ?? "https://testnet.arcscan.app";

export function txUrl(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}
