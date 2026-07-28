export function Progress({
  value,
  tone = "brand",
  size = "md",
  className = "",
}: {
  value: number; // 0-100
  tone?: "brand" | "success" | "navy";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2.5";
  const color = tone === "success" ? "bg-success" : tone === "navy" ? "bg-navy" : "bg-brand";
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-[#eceef2] ${height} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
