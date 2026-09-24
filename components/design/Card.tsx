import Link from "next/link";
import { HTMLAttributes } from "react";

/**
 * Card — Surface (DESIGN.md › Components): a white island on the cream
 * canvas, 20px radius, 32px padding, no shadow.
 * Card — Warm: belongs to the page rather than floating on it.
 */
type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Drop the 32px padding (for cards that hold ruled lists edge to edge). */
  flush?: boolean;
};

function cls(base: string, flush: boolean | undefined, extra = "") {
  return [base, flush && "card--flush", extra].filter(Boolean).join(" ");
}

export function SurfaceCard({ flush, className, ...props }: CardProps) {
  return <div {...props} className={cls("card-surface", flush, className)} />;
}

export function WarmCard({ flush, className, ...props }: CardProps) {
  return <div {...props} className={cls("card-warm", flush, className)} />;
}

/** A Surface Card that is a link — gains a hairline ink border on hover. */
export function SurfaceCardLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cls("card-surface card--interactive block no-underline", false, className)}>
      {children}
    </Link>
  );
}
