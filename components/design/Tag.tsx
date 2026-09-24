/**
 * Tag / Badge (DESIGN.md › Components): compact pill, no icons.
 * cream/black per the MD; white and marigold are the pool-status additions
 * (Refunded, Closing soon).
 */
export type TagTone = "cream" | "black" | "white" | "marigold";

export function Tag({
  tone = "cream",
  small = false,
  className = "",
  children,
}: {
  tone?: TagTone;
  small?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={`tag tag--${tone} ${small ? "tag--sm" : ""} ${className}`}>{children}</span>;
}

/** A Tag used as a filter toggle: black when selected, cream otherwise. */
export function TagButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`tag ${selected ? "tag--black" : "tag--cream"}`}>
      {children}
    </button>
  );
}
