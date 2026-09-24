"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Navigation Bar (DESIGN.md › Components): Buttercream, ~64px, no border or
 * shadow. Logo left, links centered (DM Sans 16/400), actions right.
 *
 * Below 900px the links + actions move into a full-screen menu that pops up
 * over the page from the hamburger: big Champ links, actions pinned to the
 * bottom, page scroll locked, Escape / close button / any link to dismiss.
 */
export type NavLink = {
  href: string;
  label: string;
  /** Show this link in the mobile menu too (default true). */
  mobile?: boolean;
};

const DESKTOP = "(min-width: 900px)";
const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export function NavigationBar({
  brand,
  links,
  actions,
  align = "center",
}: {
  brand: React.ReactNode;
  links: NavLink[];
  actions?: React.ReactNode;
  /** "center" per DESIGN.md; "left" puts the links beside the logo (app). */
  align?: "center" | "left";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open: lock page scroll, focus the close button, close on Escape or
  // when the viewport grows to desktop width (the menu is hidden there).
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia(DESKTOP);
    const onResize = () => {
      if (mq.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onResize);
      toggle?.focus();
    };
  }, [open]);

  const isActive = (href: string) =>
    !href.includes("#") && (pathname === href || pathname.startsWith(href + "/"));

  const renderLink = (l: NavLink, className: string, style?: React.CSSProperties) => {
    const props = {
      className,
      style,
      "aria-current": isActive(l.href) ? ("page" as const) : undefined,
      onClick: () => setOpen(false),
    };
    return l.href.includes("#") ? (
      <a key={l.href} href={l.href} {...props}>
        {l.label}
      </a>
    ) : (
      <Link key={l.href} href={l.href} {...props}>
        {l.label}
      </Link>
    );
  };

  const mobileLinks = links.filter((l) => l.mobile !== false);
  const hasMenu = mobileLinks.length > 0 || !!actions;
  const reveal = open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0";

  return (
    <header className={`nav-bar ${align === "left" ? "nav-bar--left" : ""}`}>
      <div className="nav-bar__inner">
        <div className="flex min-w-0 items-center">{brand}</div>

        <nav aria-label="Primary" className="hidden items-center gap-2 min-[900px]:flex">
          {links.map((l) => renderLink(l, "nav-bar__link"))}
        </nav>

        <div className="flex items-center justify-end gap-3">
          {actions && <div className="hidden items-center gap-3 min-[900px]:flex">{actions}</div>}
          {hasMenu && (
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen(true)}
              className="pill-button pill-button--outlined !h-11 !w-11 !p-0 min-[900px]:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="nav-menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Full-screen mobile menu. Always mounted so it can animate both ways;
          `inert` when closed keeps it out of the tab order and reading order. */}
      {hasMenu && (
        <div
          id="nav-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!open}
          className={`fixed inset-0 z-50 flex h-[100dvh] flex-col bg-buttercream transition-[opacity,transform] duration-300 min-[900px]:hidden ${EASE} ${
            open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0"
          }`}
        >
          {/* Top bar — mirrors the nav so the menu reads as its expansion */}
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-[var(--gutter)]">
            <div className="flex min-w-0 items-center">{brand}</div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="pill-button pill-button--outlined !h-11 !w-11 !p-0"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links — large Champ, ruled, staggered in */}
          <nav aria-label="Primary" className="flex flex-1 flex-col justify-center overflow-y-auto px-[var(--gutter)]">
            {mobileLinks.length > 0 && (
              <div className="border-t border-ink-black">
                {mobileLinks.map((l, i) =>
                  renderLink(
                    l,
                    `block border-b border-ink-black py-5 font-champ text-[38px] font-extrabold leading-none text-ink-black no-underline transition-[opacity,transform] duration-300 ${EASE} ${reveal} aria-[current=page]:underline aria-[current=page]:decoration-[3px] aria-[current=page]:underline-offset-[6px]`,
                    { transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }
                  )
                )}
              </div>
            )}
          </nav>

          {/* Actions — pinned to the bottom, full width */}
          {actions && (
            <div
              className={`flex shrink-0 flex-col gap-3 px-[var(--gutter)] pb-[max(24px,env(safe-area-inset-bottom))] pt-6 transition-[opacity,transform] duration-300 ${EASE} ${reveal} [&>*]:w-full [&>*]:justify-center`}
              style={{ transitionDelay: open ? `${80 + mobileLinks.length * 50}ms` : "0ms" }}
              onClick={() => setOpen(false)}
            >
              {actions}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
