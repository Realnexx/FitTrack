import { format } from "date-fns";

export const DEFAULT_TZ = "Asia/Manila";

/** YYYY-MM-DD for "now" in the given time zone. */
export function todayISO(tz = DEFAULT_TZ, d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Parse YYYY-MM-DD as a local calendar date (no TZ shift). */
export function parseISODate(s: string): Date {
  const [y = 0, m = 1, d = 1] = s.split("-").map(Number);
  const result = new Date(y, m - 1, d);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    result.getFullYear() !== y ||
    result.getMonth() !== m - 1 ||
    result.getDate() !== d
  )
    throw new Error("Invalid calendar date");
  return result;
}

export function shiftISO(s: string, days: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

export const fmtDate = (d: string | Date, f = "MMM d, yyyy") =>
  format(typeof d === "string" ? new Date(d) : d, f);

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
