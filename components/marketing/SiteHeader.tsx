"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";

// Section anchors point at the landing page (/#…) so they work from any page,
// not just the home route. /docs is a real route.
const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/#faq", label: "FAQ" },
  { href: "/docs", label: "Documentation" },
];

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    toggleBtnRef.current?.focus();
  }

  // While open: lock body scroll, move focus into the menu, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size={30} />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) =>
            l.href.includes("#") ? (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-medium text-black no-underline hover:text-brand-600"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-medium text-black no-underline hover:text-brand-600"
              >
                {l.label}
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center gap-2">
          {/* Auth CTAs are desktop-only (md+). On mobile the full-screen menu
              carries them, so the mobile header stays just logo + hamburger. */}
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="hidden h-9 items-center rounded-none bg-navy px-4 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-[#12365f] hover:shadow-lg md:inline-flex"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-9 items-center rounded-none px-3 text-sm font-semibold text-black md:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="hidden h-9 items-center rounded-none bg-navy px-4 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-[#12365f] hover:shadow-lg md:inline-flex"
              >
                Get started
              </Link>
            </>
          )}
          <button
            ref={toggleBtnRef}
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-surface-2 md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Full-screen mobile menu. Always mounted so it can animate both ways;
          `inert` when closed keeps its links out of the tab order without
          killing the exit transition (which `hidden`/`invisible` would). */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-50 h-[100dvh] bg-navy text-white transition-[opacity,transform] duration-300 md:hidden ${EASE} ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Top bar — aligned with the header so it reads as an expansion */}
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Logo href={null} size={30} tone="light" />
            <button
              ref={closeBtnRef}
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
              aria-label="Close menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links — staggered reveal */}
          <nav className="flex flex-1 flex-col justify-center gap-1 px-6">
            {LINKS.map((l, i) => {
              const cls = `block py-3 text-[26px] font-bold tracking-tight text-white no-underline transition-all duration-300 ${EASE} hover:text-brand ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`;
              const style = { transitionDelay: open ? `${80 + i * 45}ms` : "0ms" };
              return l.href.includes("#") ? (
                <a key={l.href} href={l.href} onClick={close} className={cls} style={style}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} onClick={close} className={cls} style={style}>
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA — reveals just after the links */}
          <div
            className={`px-6 pb-10 transition-all duration-300 ${EASE} ${
              open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            style={{ transitionDelay: open ? `${80 + LINKS.length * 45}ms` : "0ms" }}
          >
            {isLoggedIn ? (
              <ButtonLink href="/dashboard" variant="coral" size="lg" className="w-full" onClick={close}>
                Open app
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/register" variant="coral" size="lg" className="w-full" onClick={close}>
                  Get started
                </ButtonLink>
                <p className="mt-5 text-center text-[15px] text-white/70">
                  Already have an account?{" "}
                  <Link href="/login" onClick={close} className="font-semibold text-white hover:underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
