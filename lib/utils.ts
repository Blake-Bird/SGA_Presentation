import { format, startOfWeek, addDays } from "date-fns";

export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function uid(prefix = "evt") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayKey(d: Date) { return format(d, "yyyy-MM-dd"); }
export function prettyDay(d: Date) { return format(d, "EEE • MMM d"); }
export function prettyTime(d: Date) { return format(d, "h:mm a"); }
