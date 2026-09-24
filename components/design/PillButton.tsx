import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

/**
 * Pill Button (DESIGN.md › Components)
 *  - "marigold": Filled (Marigold) — the single primary CTA on a surface.
 *  - "outlined": Outlined (Black) — secondary action / nav; Marigold's partner.
 *  - "black":    Filled (Black)   — high-emphasis secondary when Marigold is present.
 *  - "outlined-light": the outlined pill reversed, for ink surfaces.
 * Padding 20px 32px; "compact" is the 12px 32px outlined/nav size.
 */
export type PillVariant = "marigold" | "outlined" | "black" | "outlined-light";

type PillProps = {
  variant?: PillVariant;
  compact?: boolean;
  block?: boolean;
  className?: string;
};

export function pillClasses({ variant = "marigold", compact = false, block = false, className = "" }: PillProps = {}) {
  return [
    "pill-button",
    `pill-button--${variant}`,
    compact && "pill-button--compact",
    block && "pill-button--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const PillButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & PillProps>(
  function PillButton({ variant, compact, block, className, type = "button", ...props }, ref) {
    return <button ref={ref} type={type} {...props} className={pillClasses({ variant, compact, block, className })} />;
  }
);

export function PillLink({
  href,
  variant,
  compact,
  block,
  className,
  children,
  ...props
}: PillProps & { href: string; children: React.ReactNode } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >) {
  const cls = pillClasses({ variant, compact, block, className });
  // In-page anchors and external URLs are plain <a>; app routes use Link.
  if (href.startsWith("http") || href.startsWith("#") || href.includes("#")) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...props}>
      {children}
    </Link>
  );
}
