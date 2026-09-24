import { SurfaceCard } from "@/components/design/Card";
import { Tag } from "@/components/design/Tag";
import { Meter } from "@/components/design/Meter";

// A static product screen, shown as a clean white card inset in a cream
// section (DESIGN.md › Imagery).
const RECENT = [
  { who: "0x4f2a…91c3", amount: "50.00", time: "2m ago" },
  { who: "0x88d1…0b7e", amount: "120.00", time: "14m ago" },
  { who: "0x2c90…ae14", amount: "25.00", time: "1h ago" },
];

export function HeroMockup() {
  return (
    <SurfaceCard className="mx-auto w-full max-w-[460px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-heading-sm">Amara &amp; Kofi&apos;s Wedding</p>
          <p className="mt-1 text-sm text-char">Closes in 9 days</p>
        </div>
        <Tag tone="black">Open</Tag>
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="stat-callout__value">$8,450</p>
          <p className="stat-callout__label mt-2">raised so far</p>
        </div>
        <p className="type-mono pb-1 text-char" style={{ fontSize: 14 }}>of $12,000</p>
      </div>
      <Meter value={70} className="mt-6" label="70% funded" />
      <p className="mt-3 text-sm">70% funded · 34 contributors</p>

      <ul className="mt-6 border-t border-ink-black">
        {RECENT.map((r) => (
          <li key={r.who} className="ledger-row flex items-center justify-between gap-3 py-3">
            <span>
              <span className="type-mono block" style={{ fontSize: 14 }}>{r.who}</span>
              <span className="text-sm text-char">{r.time}</span>
            </span>
            <span className="type-mono" style={{ fontSize: 16 }}>+${r.amount}</span>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
