import { ARC_EXPLORER_URL } from "./network";

// Block-explorer URL helpers for Arc mainnet. Works in both server and client
// components (the base is public; NEXT_PUBLIC_ARC_EXPLORER_URL can override it).

export function txUrl(hash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${ARC_EXPLORER_URL}/address/${address}`;
}
