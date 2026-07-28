import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo href={null} size={30} tone="light" />
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Pool together. Grow together. Achieve together. The calm way for groups to reach a shared goal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 sm:grid-cols-3">
            {[
              { h: "Product", items: ["How it works", "Use cases", "Security"] },
              { h: "Company", items: ["About", "Blog", "Contact"] },
              { h: "Legal", items: ["Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{col.h}</p>
                <ul className="mt-3 space-y-2">
                  {col.items.map((i) => (
                    <li key={i}>
                      <span className="text-sm text-white/80 hover:text-white">{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Harambee. Funds held in audited smart-contract escrow.</p>
          <p>Built on Circle Arc · Settled in USDC</p>
        </div>
      </div>
    </footer>
  );
}
