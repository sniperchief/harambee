import { createOnrampServerKit, type OnrampServerKit } from "@circle-fin/onramp-kit/server";

// Server-only. Circle's Arc Onramp: a hosted widget (onramp.arc.io, backed by
// Transak) where a user buys USDC with a bank transfer and it lands on Arc in
// their wallet. The server trades the Circle API key for a 30-minute session;
// the browser only ever sees that session.
//
// Harambee opens the widget as a popup. Embedding it as an iframe in
// production needs ONRAMP_REFERRER_DOMAIN, which Circle ties to KYB — so it's
// only the fallback for in-app browsers / installed PWAs, where popups can't
// talk back. Card, Apple Pay and Google Pay also need KYB; without it the
// widget offers bank transfer only (select US states / EU countries).

// Where the widget and Circle's API live. Defaults are production; point both
// at the sandbox hosts for local development (production blocks localhost).
export const ONRAMP_WIDGET_BASE_URL = process.env.ONRAMP_WIDGET_BASE_URL || "https://onramp.arc.io";
const ONRAMP_API_BASE_URL = process.env.ONRAMP_API_BASE_URL || "https://api.circle.com";

// Only USDC on Arc — the one asset Harambee pools hold.
export const ONRAMP_ASSETS = { pairs: [{ token: "USDC", chain: "arc" }] };

let kit: OnrampServerKit | null = null;

/** The onramp server kit, or null when no API key is configured. */
export function getOnrampKit(): OnrampServerKit | null {
  if (kit) return kit;
  const apiKey = process.env.ONRAMP_API_KEY || process.env.CIRCLE_API_KEY;
  if (!apiKey) return null;
  kit = createOnrampServerKit({
    apiKey,
    baseUrl: ONRAMP_API_BASE_URL,
    widgetBaseUrl: ONRAMP_WIDGET_BASE_URL,
    referrerDomain: process.env.ONRAMP_REFERRER_DOMAIN || undefined,
  });
  return kit;
}
