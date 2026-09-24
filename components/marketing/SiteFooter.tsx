import Link from "next/link";
import { Logo } from "@/components/Logo";

// Footer sits on surface level 3 (Ink) — the inverted block DESIGN.md reserves
// for footers and high-contrast sections.
const COLUMNS: { h: string; items: { label: string; href: string }[] }[] = [
  {
    h: "Product",
    items: [
      { label: "How it works", href: "/#how" },
      { label: "Use cases", href: "/#use-cases" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  { h: "Resources", items: [{ label: "Documentation", href: "/docs" }] },
];

export function SiteFooter() {
  return (
    <footer className="section section--ink">
      <div className="section__inner">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo href={null} tone="light" />
            <p className="type-sub-display mt-6">Pool together. Give together. Achieve together.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-8">
            {COLUMNS.map((col) => (
              <div key={col.h}>
                <p className="text-sm text-bone-white/60">{col.h}</p>
                <ul className="mt-4 space-y-3">
                  {col.items.map((i) => (
                    <li key={i.label}>
                      <Link href={i.href} className="text-body text-bone-white underline-offset-4 hover:underline">
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <hr className="mt-20 border-0 border-t border-bone-white/25" />
        <div className="mt-6 flex flex-col gap-2 text-sm text-bone-white/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Harambee. Funds held in audited smart-contract escrow.</p>
          <p>Built on Circle Arc · Settled in USDC</p>
        </div>
      </div>
    </footer>
  );
}
