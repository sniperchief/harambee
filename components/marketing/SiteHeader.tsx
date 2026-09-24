"use client";

import { Logo } from "@/components/Logo";
import { NavigationBar } from "@/components/design/NavigationBar";
import { PillLink } from "@/components/design/PillButton";

// Section anchors point at the landing page (/#…) so they work from any page.
const LINKS = [
  { href: "/#how", label: "How it works", mobile: false },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <NavigationBar
      brand={<Logo />}
      links={LINKS}
      actions={
        isLoggedIn ? (
          <PillLink href="/dashboard" variant="marigold" compact>
            Open app
          </PillLink>
        ) : (
          <>
            <PillLink href="/login" variant="outlined" compact>
              Sign in
            </PillLink>
            <PillLink href="/register" variant="marigold" compact>
              Get started
            </PillLink>
          </>
        )
      }
    />
  );
}
