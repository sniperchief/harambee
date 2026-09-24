/**
 * Feature Grid — 3 Column (DESIGN.md › Components): Surface Cards on the cream
 * canvas, 24px gap, 20px radius, 32px padding, a hairline ink border. A plain
 * DM Mono marker (e.g. "01") sits above a Champ heading and DM Sans body.
 */
export type Feature = {
  title: string;
  body: string;
  /** Small leading marker — a step number or short label. */
  marker?: React.ReactNode;
};

export function FeatureGrid({ items, className = "" }: { items: Feature[]; className?: string }) {
  return (
    <div className={`feature-grid ${className}`}>
      {items.map((f) => (
        <div key={f.title} className="card-surface border border-ink-black">
          {f.marker && <p className="font-dm-mono text-sm">{f.marker}</p>}
          <h3 className={`type-heading-sm ${f.marker ? "mt-10" : ""}`}>{f.title}</h3>
          <p className="mt-3 max-w-[300px] text-body text-ink-black/75">{f.body}</p>
        </div>
      ))}
    </div>
  );
}
