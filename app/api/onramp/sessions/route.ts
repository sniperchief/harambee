import { NextResponse } from "next/server";
import { KitError } from "@circle-fin/onramp-kit/server";
import { getSessionUser } from "@/lib/session";
import { getOnrampKit, ONRAMP_ASSETS, ONRAMP_WIDGET_BASE_URL } from "@/lib/onramp";

const NO_STORE = { "Cache-Control": "no-store" };

// KitError.type → HTTP status, as Circle's own route handler maps them.
const STATUS: Record<string, number> = { INPUT: 400, RATE_LIMIT: 429, NETWORK: 504, SERVICE: 502, RPC: 502 };

/**
 * POST /api/onramp/sessions → { session, widgetBaseUrl }
 * Mints an onramp session for the signed-in user. The destination is always
 * their own wallet, read from the database — never from the request body, so
 * nobody can use Harambee's API key to buy into someone else's address.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401, headers: NO_STORE });
  if (!user.modular_wallet_address) {
    return NextResponse.json({ error: "Your wallet isn't set up yet." }, { status: 409, headers: NO_STORE });
  }

  const kit = getOnrampKit();
  if (!kit) {
    return NextResponse.json({ error: "Buying USDC isn't available right now." }, { status: 503, headers: NO_STORE });
  }

  try {
    const session = await kit.createSession({
      appUserId: user.id,
      destinationAddress: user.modular_wallet_address,
      assets: ONRAMP_ASSETS,
    });
    return NextResponse.json({ session, widgetBaseUrl: ONRAMP_WIDGET_BASE_URL }, { headers: NO_STORE });
  } catch (err) {
    const status = err instanceof KitError ? STATUS[err.type] ?? 500 : 500;
    console.error("onramp createSession failed", err instanceof KitError ? { type: err.type, code: err.code, message: err.message } : err);
    return NextResponse.json(
      { error: status === 429 ? "Too many attempts — try again in a minute." : "Couldn't start the purchase. Please try again." },
      { status, headers: NO_STORE }
    );
  }
}
