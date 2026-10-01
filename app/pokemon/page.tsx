import FeedList, { type FeedRow } from "@/components/FeedList";
import { db } from "@/lib/db";
import { ago } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "stock", label: "Drops & restocks" },
  { key: "news", label: "News & deals" },
];

export default async function Pokemon({ searchParams }: PageProps<"/pokemon">) {
  const f = String((await searchParams).f ?? "all");
  let query = db()
    .from("feed_items")
    .select("id, kind, source, title, url, price, image, published_at, created_at")
    .eq("tab", "pokemon")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(150);
  if (f === "stock") query = query.in("kind", ["new_listing", "restock"]);
  if (f === "news") query = query.in("kind", ["news", "deal", "discussion"]);

  const [{ data: rows }, { data: health }] = await Promise.all([
    query,
    db().from("source_health").select("key, fail_count, last_ok"),
  ]);
  const down = (health ?? []).filter((h) => h.fail_count >= 3);
  const lastRun = (health ?? []).map((h) => h.last_ok).filter(Boolean).sort().pop();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Pokémon</h1>
        <p className="text-sm text-muted">
          6 Edmonton shops, Walmart and Best Buy, checked every 5 min. Last check {ago(lastRun)}.
        </p>
        {down.length > 0 && <p className="mt-1 text-xs text-warn">Not answering: {down.map((d) => d.key).join(", ")}</p>}
      </header>

      <nav className="flex gap-2 overflow-x-auto">
        {FILTERS.map((x) => (
          <a
            key={x.key}
            href={x.key === "all" ? "/pokemon" : `/pokemon?f=${x.key}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${f === x.key ? "bg-accent text-accent-text" : "bg-surface text-muted"}`}
          >
            {x.label}
          </a>
        ))}
      </nav>

      <FeedList
        rows={(rows ?? []) as FeedRow[]}
        empty="Nothing new yet. New listings and restocks at the shops show up here, and you get a push for anything you can buy right now."
      />
    </div>
  );
}
