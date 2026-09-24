/**
 * Hero — Full-bleed with scrim (DESIGN.md › Components).
 * Full-viewport photograph behind a warm dark scrim; centered Champ 72/800
 * headline in white, DM Sans 20px subtext, Marigold pill CTA below.
 *
 * The image is warm, documentary-style photography. Until one is placed at
 * `image`, the hero falls back to the scrim's warm dark tone.
 */
export function Hero({
  image,
  headline,
  subtext,
  actions,
}: {
  image?: string;
  headline: React.ReactNode;
  subtext?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="hero" style={image ? { backgroundImage: `url(${image})` } : undefined}>
      <div className="mx-auto max-w-4xl animate-fade-in">
        <h1 className="type-display">{headline}</h1>
        {subtext && <p className="type-subheading mx-auto mt-6 max-w-2xl text-bone-white/85">{subtext}</p>}
        {actions && <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">{actions}</div>}
      </div>
    </section>
  );
}
