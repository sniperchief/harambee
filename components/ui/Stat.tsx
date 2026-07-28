import { Card } from "./Card";

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "brand";
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  const accent =
    tone === "success"
      ? "text-success bg-success-50"
      : tone === "brand"
        ? "text-brand-600 bg-brand-50"
        : "text-muted bg-surface-2";
  return (
    <Card className={large ? "p-6" : "p-5"}>
      <div className="flex items-start justify-between">
        <p className={`font-medium text-muted ${large ? "text-[15px]" : "text-sm"}`}>{label}</p>
        {icon && (
          <span
            className={`flex items-center justify-center rounded-[12px] ${accent} ${large ? "h-10 w-10" : "h-8 w-8"}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={`mt-3 font-semibold leading-none tracking-tight text-ink tnum ${large ? "text-[38px]" : "text-[26px]"}`}
      >
        {value}
      </p>
      {sub && <p className={`text-muted ${large ? "mt-2.5 text-sm" : "mt-2 text-sm"}`}>{sub}</p>}
    </Card>
  );
}
