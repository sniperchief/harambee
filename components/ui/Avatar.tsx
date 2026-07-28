import { avatarTone } from "@/lib/format";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 36,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const tone = avatarTone(name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <span key={i} className="-ml-2 first:ml-0 rounded-full ring-2 ring-surface">
          <Avatar name={n} size={30} />
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-2 flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-surface-2 px-1.5 text-xs font-semibold text-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </div>
  );
}
