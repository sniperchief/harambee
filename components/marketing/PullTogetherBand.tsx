// "Harambee" means "all pull together". A full-bleed ink band with the phrase
// set huge in Champ, cropped at both edges and drifting slowly sideways. With
// reduced motion it simply holds still, cropped.
const PHRASE = "all pull together";

function Run({ hidden = false }: { hidden?: boolean }) {
  return (
    <span aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {[0, 1].map((i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-[0.18em]">{PHRASE}</span>
          <span aria-hidden className="inline-block h-[0.14em] w-[0.14em] rounded-full bg-marigold" />
        </span>
      ))}
    </span>
  );
}

export function PullTogetherBand() {
  return (
    <section aria-label="Harambee — all pull together" className="overflow-hidden bg-ink-black text-bone-white">
      <div className="flex w-max animate-marquee py-6 font-champ text-[clamp(96px,17vw,240px)] font-extrabold leading-[0.95] tracking-[-0.02em] -translate-x-[4%]">
        <Run />
        <Run hidden />
      </div>
    </section>
  );
}
