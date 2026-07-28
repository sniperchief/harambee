"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A slim top progress bar that starts the instant an internal link is clicked
// and completes when the route actually changes — so every navigation gives
// immediate feedback even while the destination is still loading. Dependency-
// free; complements the route-level loading.tsx skeletons.
export function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const prevPath = useRef(pathname);

  function clearTrickle() {
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
  }

  function finish() {
    if (!pending.current) return;
    pending.current = false;
    clearTrickle();
    setWidth(100);
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  }

  function start() {
    if (pending.current) return;
    pending.current = true;
    setVisible(true);
    setWidth(10);
    clearTrickle();
    trickle.current = setInterval(() => {
      setWidth((w) => (w >= 90 ? w : w + 5));
    }, 200);
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(finish, 10000); // safety net
  }

  // Start on internal link clicks (capture phase, before Next's handler).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || anchor.getAttribute("target") === "_blank" || !href.startsWith("/")) return;
      const dest = href.split(/[?#]/)[0];
      if (!dest || dest === pathname) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Complete when the route actually changes.
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(
    () => () => {
      clearTrickle();
      if (hide.current) clearTimeout(hide.current);
    },
    []
  );

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-brand shadow-[0_0_8px_rgba(255,127,80,0.7)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
