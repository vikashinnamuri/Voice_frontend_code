// UK formatting: dates dd/mm/yyyy, 24-hour clock, GBP, Europe/London time zone.
const TZ = "Europe/London";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const formatDateUK = (iso: string | null | undefined): string =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)) : "–";

export const formatTimeUK = (iso: string | null | undefined): string =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) : "–";

export const formatDateTimeUK = (iso: string | null | undefined): string => (iso ? `${formatDateUK(iso)}, ${formatTimeUK(iso)}` : "–");

export const formatLongDateUK = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

/** "Today", "Yesterday", or the UK date: friendlier in lists. */
export function formatDayLabel(iso: string): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const target = day(new Date(iso));
  if (target === day(new Date())) return "Today";
  if (target === day(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return formatDateUK(iso);
}

export const formatGBP = (value: number | null | undefined): string =>
  value == null ? "–" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60), s = total % 60;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export const formatClock = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** A move-in date is an ISO date when the caller gave one, otherwise their own words. */
export const formatMoveIn = (value: string | null): string => (!value ? "–" : ISO_DATE.test(value) ? formatDateUK(`${value}T12:00:00Z`) : value);

export const formatBool = (value: boolean | null): string => (value == null ? "–" : value ? "Yes" : "No");

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "–";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const initials = (name: string | null): string =>
  (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
