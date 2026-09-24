/**
 * Stat Callout (DESIGN.md › Components): large number in Champ 54px/800 with a
 * DM Sans 16px label beneath. `mono` renders a precise currency figure in
 * DM Mono 18px instead.
 */
export function StatCallout({
  value,
  label,
  mono = false,
  className = "",
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={mono ? "type-mono" : "stat-callout__value"}>{value}</p>
      <p className="stat-callout__label mt-2">{label}</p>
    </div>
  );
}
