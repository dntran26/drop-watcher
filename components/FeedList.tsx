import { ago, dayLabel, money } from "@/lib/format";

export interface FeedRow {
  id: number;
  kind: string;
  source: string;
  title: string;
  url: string;
  price: number | null;
  image: string | null;
  published_at: string | null;
  created_at: string;
}

const KIND = {
  new_listing: { label: "New", cls: "bg-in-bg text-in" },
  restock: { label: "Restock", cls: "bg-in-bg text-in" },
  news: { label: "News", cls: "bg-surface-2 text-muted" },
  deal: { label: "Deal", cls: "bg-out-bg text-out" },
  discussion: { label: "Talk", cls: "bg-surface-2 text-muted" },
} as Record<string, { label: string; cls: string }>;

export default function FeedList({ rows, empty }: { rows: FeedRow[]; empty: string }) {
  if (!rows.length) return <p className="rounded-2xl bg-surface p-6 text-center text-muted">{empty}</p>;

  const groups = new Map<string, FeedRow[]>();
  for (const r of rows) {
    const key = dayLabel(r.published_at ?? r.created_at);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="space-y-6">
      {[...groups].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{day}</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
            {items.map((r) => {
              const k = KIND[r.kind] ?? KIND.news;
              return (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex gap-3 p-3 active:bg-surface-2">
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote shop images, any host
                      <img src={r.image} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg bg-white object-contain" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium leading-snug">{r.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${k.cls}`}>{k.label}</span>
                        <span>{r.source}</span>
                        {r.price != null && <span className="font-semibold text-text">{money(r.price)}</span>}
                        <span>{ago(r.published_at ?? r.created_at)}</span>
                      </p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
