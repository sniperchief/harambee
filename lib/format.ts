// Presentation helpers. Money is USDC (6dp on-chain) but we show it the way a
// bank would — grouped, 2dp, tabular. Nothing here touches chain logic.

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  NGN: "₦",
  KES: "KSh",
  GHS: "GH₵",
  ZAR: "R",
};

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return "";
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/** USDC amount, shown like money: 1,250.00 */
export function formatUsdc(value: string | number | null | undefined, opts?: { decimals?: number }): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: opts?.decimals ?? 2,
    maximumFractionDigits: opts?.decimals ?? 2,
  });
}

/** Compact for tiles: 12.5K, 1.2M */
export function formatCompact(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return formatUsdc(n, { decimals: n % 1 === 0 ? 0 : 2 });
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export function formatLocal(value: string | number | null | undefined, code: string | null | undefined): string {
  const sym = currencySymbol(code);
  return `${sym}${formatUsdc(value, { decimals: 0 })}`;
}

export function progressPercent(current: string | number, target: string | number): number {
  const c = Number(current ?? 0);
  const t = Number(target ?? 0);
  if (!(t > 0)) return 0;
  return Math.min(100, (c / t) * 100);
}

export function shortAddress(addr: string | null | undefined): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** "12 days remaining", "4 hours remaining", "Closed" */
export function timeUntil(deadline: string): { label: string; urgent: boolean; past: boolean } {
  const now = Date.now();
  const then = new Date(deadline).getTime();
  const diff = then - now;
  if (diff <= 0) return { label: "Closed", urgent: false, past: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (days >= 2) return { label: `${days} days remaining`, urgent: days <= 3, past: false };
  if (days === 1) return { label: "1 day remaining", urgent: true, past: false };
  if (hours >= 1) return { label: `${hours} hours remaining`, urgent: true, past: false };
  const mins = Math.max(1, Math.floor(diff / 60_000));
  return { label: `${mins} min remaining`, urgent: true, past: false };
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export type PoolStatus = "open" | "released" | "refunded" | "cancelled";

export type ReleaseMode = "threshold_or_deadline" | "threshold_only" | "deadline_only";

// A fundraiser's release rule in plain words: what the organizer picks from,
// and what contributors are told happens at the goal and at the deadline.
// Mirrors PoolEscrow.checkAndRelease.
export const RELEASE_RULES: Record<
  ReleaseMode,
  { title: string; body: string; atGoal: string; atDeadline: string }
> = {
  threshold_or_deadline: {
    title: "Goal or deadline, whichever comes first",
    body: "Funds go to the recipient as soon as the goal is reached, or at the deadline with whatever was raised.",
    atGoal: "Funds go to the recipient as soon as the goal is reached.",
    atDeadline: "Whatever was raised goes to the recipient.",
  },
  threshold_only: {
    title: "Only if the goal is reached",
    body: "Funds go to the recipient the moment the goal is reached. If the deadline passes first, contributors get their money back.",
    atGoal: "Funds go to the recipient the moment the goal is reached.",
    atDeadline: "Every contributor can claim back exactly what they gave.",
  },
  deadline_only: {
    title: "At the deadline",
    body: "Accept contributions right up to the deadline, then send whatever was raised to the recipient.",
    atGoal: "Contributions stay open until the deadline.",
    atDeadline: "Whatever was raised goes to the recipient.",
  },
};

export function statusMeta(status: PoolStatus): {
  label: string;
  tone: "brand" | "success" | "muted" | "warning";
} {
  switch (status) {
    case "open":
      return { label: "Open", tone: "brand" };
    case "released":
      return { label: "Released", tone: "success" };
    case "refunded":
      return { label: "Refunded", tone: "warning" };
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
    default:
      return { label: status, tone: "muted" };
  }
}

/** Deterministic soft avatar color from a string (initials avatars). */
export function avatarTone(seed: string): { bg: string; fg: string } {
  const palette = [
    { bg: "#eef4ff", fg: "#2f74e6" },
    { bg: "#ecfdf5", fg: "#0f9d6b" },
    { bg: "#fff7ed", fg: "#c2620a" },
    { bg: "#f5f3ff", fg: "#7c5cff" },
    { bg: "#fdf2f8", fg: "#be3f7e" },
    { bg: "#f0fdfa", fg: "#0d9488" },
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}
