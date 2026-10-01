const STYLES = {
  in: "bg-in-bg text-in",
  out: "bg-out-bg text-out",
  unknown: "bg-surface-2 text-muted",
  blocked: "bg-warn-bg text-warn",
} as const;

const LABELS = { in: "In stock", out: "Sold out", unknown: "Checking", blocked: "Can't check" } as const;

export default function StatusPill({ status }: { status: keyof typeof STYLES }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
