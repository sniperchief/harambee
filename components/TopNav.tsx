"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { shortAddress } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pools", label: "Pools" },
  { href: "/activity", label: "Activity" },
];

export function TopNav({ walletAddress, name }: { walletAddress: string | null; name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo href="/" size={30} />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm no-underline text-black ${
                  isActive(item.href) ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* The account chip is the Settings entry point on desktop. */}
          <Link
            href="/settings"
            className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-2 md:inline-flex"
          >
            <Avatar name={name} size={30} />
            <span className="text-sm font-medium text-ink tnum">{shortAddress(walletAddress) || "Account"}</span>
          </Link>

          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-surface-2 md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 text-[15px] no-underline text-black ${
                  isActive(item.href) ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {/* Settings lives on the account chip on desktop; on mobile it needs its own row. */}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-3 border-t border-line px-3 pt-3 no-underline"
            >
              <Avatar name={name} size={32} />
              <span className="flex flex-col">
                <span className="text-[15px] font-medium text-black">Settings</span>
                <span className="text-xs text-muted tnum">{shortAddress(walletAddress) || "Account"}</span>
              </span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
