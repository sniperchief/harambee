import Link from "next/link";
import Image from "next/image";

// The official Harambee mark (public/harambee-logo.png) is a navy silhouette;
// it's rendered as pure ink (or bone white on ink) via CSS filters. The mark is
// the capital "H" and the Champ 26/800 wordmark appends "arambee".
const RATIO = 700 / 923; // intrinsic width / height of the cropped mark

export function LogoMark({
  size = 28,
  tone = "dark",
  className = "",
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Image
      src="/harambee-logo.png"
      alt="Harambee"
      width={Math.round(size * RATIO)}
      height={size}
      className={className}
      style={{ filter: tone === "light" ? "brightness(0) invert(1)" : "brightness(0)" }}
    />
  );
}

export function Logo({
  href = "/",
  tone = "dark",
  className = "",
}: {
  href?: string | null;
  tone?: "dark" | "light";
  /** @deprecated the wordmark is fixed at Champ 26px. */
  size?: number;
  className?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-0.5 ${tone === "light" ? "text-bone-white" : "text-ink-black"} ${className}`}>
      <LogoMark size={28} tone={tone} />
      <span className="type-heading-sm leading-none">arambee</span>
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex items-center rounded-full no-underline">
      {inner}
    </Link>
  );
}
