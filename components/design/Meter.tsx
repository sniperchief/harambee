/** Ledger meter — a pool's progress toward target on a pale cream track.
 *  ink = live, char = released, oat = refunded / cancelled. */
export function Meter({
  value,
  tone = "ink",
  className = "",
  label,
}: {
  value: number;
  tone?: "ink" | "char" | "oat";
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`meter ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`meter__fill ${tone === "ink" ? "" : `meter__fill--${tone}`}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
