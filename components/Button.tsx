import { ButtonHTMLAttributes } from "react";

const VARIANT_CLASSES = {
  primary: "bg-black text-white dark:bg-white dark:text-black",
  secondary: "border border-zinc-300 text-black dark:border-zinc-700 dark:text-zinc-50",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT_CLASSES }) {
  return (
    <button
      {...props}
      className={`rounded px-4 py-2 disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
