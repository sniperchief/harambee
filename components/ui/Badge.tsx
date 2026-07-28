type Tone = "brand" | "success" | "muted" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-600",
  success: "bg-success-50 text-[#0f9d6b]",
  warning: "bg-warning-50 text-[#b45309]",
  danger: "bg-danger-50 text-danger",
  muted: "bg-surface-2 text-muted",
};

export function Badge({
  tone = "muted",
  children,
  dot = false,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
