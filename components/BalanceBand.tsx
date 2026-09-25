"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createOnrampKit, type OnrampSession } from "@circle-fin/onramp-kit";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { formatUsdc } from "@/lib/format";
import { QRCodeSVG } from "qrcode.react";
import { PillButton } from "@/components/design/PillButton";
import { Tag } from "@/components/design/Tag";

type Minted = { session: OnrampSession; widgetBaseUrl: string };
type Widget = { close(): void };

// Why a purchase stopped, in words a contributor can act on. Codes the widget
// adds later fall through to the generic line.
const NOT_COMPLETED: Record<string, string> = {
  CANCELED_BY_CUSTOMER: "",
  SESSION_TIMEOUT: "",
  NO_PAYMENT_OPTIONS: "Bank transfer isn't available where you are yet. Send USDC to your wallet address instead.",
  CUSTOMER_PENDING_REVIEW: "Your identity check is still under review. Try again once it's approved.",
  CUSTOMER_REJECTED: "The payment provider couldn't verify your identity. Send USDC to your wallet address instead.",
  PAYMENT_PROVIDER_ERROR: "The payment provider hit a problem. Please try again.",
};

// The dashboard's money surface: an ink panel with the available balance as a
// large DM Mono figure. "Add funds" opens two ways in. The main one is sending
// USDC on Arc to this wallet (QR code + address). The other is buying USDC by
// bank transfer through Circle's Arc Onramp, which opens as a popup and
// delivers to this wallet.
export function BalanceBand({ address }: { address: string | null }) {
  const { balance, loading, refresh } = useWalletBalance();
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [minted, setMinted] = useState<Minted | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState("");
  const [status, setStatus] = useState("");
  const [inline, setInline] = useState(false);
  const widgetRef = useRef<Widget | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sessions are minted ahead of the click: the popup must open synchronously
  // inside the click handler or the browser blocks it.
  const mint = useCallback(async () => {
    setMinting(true);
    setMintError("");
    try {
      const r = await fetch("/api/onramp/sessions", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Couldn't start the purchase. Please try again.");
      setMinted(body as Minted);
    } catch (e) {
      setMinted(null);
      setMintError(e instanceof Error ? e.message : "Couldn't start the purchase. Please try again.");
    } finally {
      setMinting(false);
    }
  }, []);

  useEffect(() => () => widgetRef.current?.close(), []);

  const callbacks = useCallback(
    () => ({
      onDepositSubmitted: () => {
        setStatus("Payment submitted. Bank transfers can take a while to clear; your balance updates when the USDC arrives.");
        refresh();
      },
      onDepositSettled: () => {
        setStatus("Your USDC has arrived.");
        refresh();
      },
      onDepositNotCompleted: ({ code }: { code: string }) => {
        setStatus(NOT_COMPLETED[code] ?? "The purchase didn't go through. Please try again.");
      },
      // A dead session: drop it so a fresh one is minted for the next click.
      onSessionExpired: () => {
        widgetRef.current?.close();
        widgetRef.current = null;
        setInline(false);
        setMinted(null);
        mint();
      },
    }),
    [refresh, mint]
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !minted && !minting) mint();
  }

  function buy() {
    if (!minted) return;
    if (Date.parse(minted.session.expiresAt) - Date.now() < 60_000) {
      // About to expire: fetch a new one; the next click opens it.
      setMinted(null);
      mint();
      setStatus("Refreshed your session. Tap “Buy USDC” again.");
      return;
    }
    setStatus("");
    widgetRef.current?.close();
    const kit = createOnrampKit({ widgetBaseUrl: minted.widgetBaseUrl });
    const result = kit.openWindow({ session: minted.session, ...callbacks() });
    if (result.status === "opened") {
      widgetRef.current = result.widget;
      // One session per purchase — mint the next one in the background.
      setMinted(null);
      mint();
    } else if (result.reason === "popup_blocked") {
      setStatus("Your browser blocked the popup. Allow popups for this site and try again.");
    } else {
      // In-app browsers and installed apps can't use popups: show it inline.
      setInline(true);
    }
  }

  // Inline fallback: mount once the sized container is in the DOM.
  useEffect(() => {
    if (!inline || !minted || !containerRef.current) return;
    const kit = createOnrampKit({ widgetBaseUrl: minted.widgetBaseUrl });
    const widget = kit.mountIframe({ session: minted.session, container: containerRef.current, ...callbacks() });
    widgetRef.current = widget;
    return () => widget.close();
    // Mount once per session; callbacks are stable apart from refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, minted]);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopy("copied");
      setTimeout(() => setCopy("idle"), 2000);
    } catch {
      // Clipboard blocked (permissions / insecure context): the address is
      // on screen, so it can be selected by hand.
      setCopy("failed");
    }
  }

  return (
    <div className="rounded-[20px] bg-ink-black p-6 text-bone-white sm:p-9">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-body text-bone-white/80">Available balance</p>
          <div className="mt-3 flex min-h-[48px] items-center sm:min-h-[84px]">
            {loading ? (
              <span className="inline-block h-14 w-60 animate-[breathe_1.6s_ease-in-out_infinite] rounded-2xl bg-bone-white/15" />
            ) : (
              <p className="font-dm-mono text-[clamp(34px,10.5vw,80px)] font-medium leading-none tracking-[-0.02em] tnum [overflow-wrap:anywhere]">
                {balance !== null ? `$${formatUsdc(balance)}` : "—"}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          <PillButton
            variant="outlined-light"
            compact
            onClick={toggle}
            disabled={!address}
            aria-expanded={open}
          >
            {open ? "Close" : "Add funds"}
          </PillButton>
        </div>
      </div>

      {open && address && (
        <div className="mt-8 flex flex-col gap-4 border-t border-bone-white/15 pt-6 animate-fade-in">
          {/* Primary: send USDC on Arc to this wallet. */}
          <div className="flex flex-col gap-6 rounded-2xl bg-bone-white p-5 text-ink-black sm:flex-row sm:items-center sm:p-6">
            <div className="shrink-0 self-center rounded-2xl border-[1.5px] border-ink-black bg-bone-white p-3">
              <QRCodeSVG value={address} size={128} fgColor="#000000" bgColor="#ffffff" level="M" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body font-medium">Send USDC to your wallet</p>
                <Tag tone="marigold" small>
                  Arc network
                </Tag>
              </div>
              <p className="mt-3 select-all break-all rounded-xl bg-buttercream px-4 py-3 font-dm-mono text-sm leading-relaxed">
                {address}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <PillButton variant="marigold" compact onClick={copyAddress}>
                  {copy === "copied" ? "Address copied" : "Copy address"}
                </PillButton>
                <p aria-live="polite" className="text-sm text-char">
                  {copy === "failed"
                    ? "Couldn't copy. Select the address above instead."
                    : "Only USDC on Arc. Other tokens or networks won't arrive."}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary: buy with a bank transfer through Arc Onramp. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-bone-white/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-body font-medium">No USDC yet? Buy with a bank transfer</p>
              <p className="mt-1 text-sm text-bone-white/70">
                {mintError ||
                  "Available in select US states and EU countries. The provider checks your ID on your first purchase."}
              </p>
            </div>
            {mintError ? (
              <PillButton variant="outlined-light" compact className="shrink-0" onClick={mint}>
                Try again
              </PillButton>
            ) : (
              <PillButton variant="outlined-light" compact className="shrink-0" onClick={buy} disabled={!minted}>
                {minting ? "Preparing…" : "Buy USDC"}
              </PillButton>
            )}
          </div>

          <p aria-live="polite" className="text-sm text-bone-white empty:hidden">
            {status}
          </p>

          {inline && <div ref={containerRef} className="h-[720px] overflow-hidden rounded-2xl bg-bone-white" />}
        </div>
      )}
    </div>
  );
}
