/**
 * Layout primitives (DESIGN.md › Layout): full-bleed bands whose content is
 * capped at 1200px, stacked with an 80px section gap. `ink` is surface level 3
 * — the inverted block reserved for high-contrast sections.
 */
export function Section({
  id,
  ink = false,
  className = "",
  innerClassName = "",
  children,
}: {
  id?: string;
  ink?: boolean;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`section ${ink ? "section--ink" : ""} scroll-mt-16 ${className}`}>
      <div className={`section__inner ${innerClassName}`}>{children}</div>
    </section>
  );
}

/** Section heading: Champ headline + optional DM Sans lead paragraph. */
export function SectionHeader({
  title,
  lead,
  as: As = "h2",
  size = "heading-lg",
  align = "left",
  action,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  as?: "h1" | "h2";
  size?: "heading-lg" | "heading";
  align?: "left" | "center";
  action?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-6 ${centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"}`}
    >
      <div className={centered ? "max-w-3xl" : "max-w-2xl"}>
        <As className={`type-${size}`}>{title}</As>
        {lead && <p className="type-subheading mt-4 opacity-80">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Section Divider: a 1px ink rule. */
export function SectionDivider({ className = "" }: { className?: string }) {
  return <hr className={`section-divider ${className}`} />;
}
