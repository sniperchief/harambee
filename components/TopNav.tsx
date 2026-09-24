"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { NavigationBar } from "@/components/design/NavigationBar";
import { shortAddress } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pools", label: "Pools" },
];

function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// App navigation: logo with the links beside it, and the account chip on the
// right — an ink initials disc plus the wallet address — which opens Settings.
export function TopNav({ walletAddress, name }: { walletAddress: string | null; name: string }) {
  const pathname = usePathname();
  const onSettings = pathname === "/settings";

  return (
    <NavigationBar
      align="left"
      brand={<Logo href="/dashboard" />}
      links={NAV}
      actions={
        <Link
          href="/settings"
          aria-current={onSettings ? "page" : undefined}
          className={`inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-ink-black py-1 pl-1 pr-4 no-underline transition-colors ${
            onSettings ? "bg-bone-white" : "hover:bg-bone-white"
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-black text-[13px] font-bold text-bone-white">
            {initials(name)}
          </span>
          <span className="font-dm-mono text-sm">{shortAddress(walletAddress) || "Account"}</span>
        </Link>
      }
    />
  );
}
