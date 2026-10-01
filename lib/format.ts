const TZ = "America/Edmonton";

export function ago(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** "Today", "Yesterday", or "Tue, Sep 29", in Edmonton time. */
export function dayLabel(iso: string): string {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (day(d) === day(today)) return "Today";
  if (day(d) === day(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-CA", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
}

export const money = (n: number | null | undefined) =>
  n == null ? "" : `$${n.toLocaleString("en-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
