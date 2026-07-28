import Link from "next/link";
import Image from "next/image";

// The official Harambee mark (public/harambee-logo.png) — transparent navy
// silhouette. On dark surfaces we invert it to white via a CSS filter. The
// mark is the capital "H"; the wordmark appends "arambee" to read "Harambee".
const RATIO = 700 / 923; // intrinsic width / height of the cropped mark

export function LogoMark({
  size = 32,
  tone = "dark",
  className = "",
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  const width = Math.round(size * RATIO);
  return (
    <Image
      src="/harambee-logo.png"
      alt="Harambee"
      width={width}
      height={size}
      className={className}
      style={tone === "light" ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}

export function Logo({
  size = 32,
  href = "/",
  tone = "dark",
  className = "",
}: {
  size?: number;
  href?: string | null;
  tone?: "dark" | "light";
  className?: string;
}) {
  const color = tone === "light" ? "text-white" : "text-navy";
  const inner = (
    <span className={`inline-flex items-center gap-1.5 ${color} ${className}`}>
      <LogoMark size={size} tone={tone} />
      <span className="text-[19px] font-bold tracking-[-0.01em]">arambee</span>
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex items-center rounded-lg">
      {inner}
    </Link>
  );
}
