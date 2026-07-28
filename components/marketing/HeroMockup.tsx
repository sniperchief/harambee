import { Sprout } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";

// A crafted, static product screen for the hero — not the reusable PoolCard.
// One dominant number, a live contributor feed, a floating notification for
// life, and a layered navy-tinted shadow so it floats confidently on white.
const RECENT = [
  { name: "Amara O.", amount: "50", time: "2m ago" },
  { name: "David K.", amount: "120", time: "14m ago" },
  { name: "Grace N.", amount: "25", time: "1h ago" },
];

export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[400px] pt-7">
      {/* subtle depth layer behind the card */}
      <div className="pointer-events-none absolute inset-x-6 bottom-2 top-12 -z-10 rounded-[26px] bg-surface-2" />

      {/* main card */}
      <div className="rounded-[24px] border border-line bg-white p-6 shadow-[0_34px_70px_-24px_rgba(15,39,71,0.30)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name="Amara Kofi" size={42} />
            <div>
              <p className="text-[15px] font-semibold leading-tight text-navy">Amara &amp; Kofi&apos;s Wedding</p>
              <p className="mt-0.5 text-xs text-muted">Pool · closes in 9 days</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-[#0f9d6b]">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-muted">Raised so far</p>
            <p className="mt-1 text-[34px] font-bold leading-none tracking-tight text-navy tnum">$8,450</p>
          </div>
          <p className="pb-1 text-sm text-muted tnum">of $12,000</p>
        </div>

        <Progress value={70} tone="brand" size="lg" className="mt-4" />
        <p className="mt-2 text-xs font-medium text-muted tnum">70% funded · 34 contributors</p>

        <div className="mt-5 border-t border-line pt-3">
          {RECENT.map((r) => (
            <div key={r.name} className="flex items-center gap-3 py-1.5">
              <Avatar name={r.name} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-tight text-ink">{r.name}</p>
                <p className="text-[11px] text-muted">contributed · {r.time}</p>
              </div>
              <p className="text-[13px] font-semibold text-navy tnum">+${r.amount}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm text-navy">
            <Sprout size={16} className="text-success" />
            Yield earned in escrow
          </span>
          <span className="text-sm font-semibold text-success tnum">+$126.40</span>
        </div>
      </div>

      {/* floating notification — sits in the top padding, within bounds */}
      <div className="absolute right-1 top-0 flex items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5 py-2.5 shadow-lg">
        <Avatar name="Zainab A." size={30} />
        <div>
          <p className="text-[12px] font-semibold leading-tight text-ink">Zainab just contributed</p>
          <p className="text-[11px] text-muted">+$75 to the pool</p>
        </div>
      </div>
    </div>
  );
}
