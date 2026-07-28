import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "coral";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none " +
  "rounded-none transition-all duration-150 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-navy text-white shadow-md hover:bg-[#12365f] hover:-translate-y-px hover:shadow-lg",
  secondary:
    "bg-surface text-ink border border-line shadow-md hover:border-line-strong hover:-translate-y-px hover:shadow-lg",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  danger: "bg-danger text-white shadow-md hover:brightness-105 hover:-translate-y-px hover:shadow-lg",
  success: "bg-success text-white shadow-md hover:brightness-105 hover:-translate-y-px hover:shadow-lg",
  // Coral CTA — white text on the deep coral (bright coral would fail contrast).
  // Coral is a co-equal brand color, so it leads the hero + key marketing actions.
  coral: "bg-brand-strong text-white shadow-md hover:brightness-95 hover:-translate-y-px hover:shadow-lg",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base min-h-[52px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & CommonProps
>(function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const isExternal = href.startsWith("http");
  if (isExternal) {
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
