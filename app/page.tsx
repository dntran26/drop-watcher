import { removeWatch, watchUrl } from "@/app/actions";
import AddWatchForm from "@/components/AddWatchForm";
import StatusPill from "@/components/StatusPill";
import { db } from "@/lib/db";
import { ago, money } from "@/lib/format";
import { searchAll } from "@/lib/search";
import type { Watch } from "@/lib/types";

const BLOCKED_AFTER = 3;

export default async function WatchTower({ searchParams }: PageProps<"/">) {
  const q = String((await searchParams).q ?? "").trim();
  const [{ data: watches }, results] = await Promise.all([
    db().from("watches").select("*").eq("active", true).order("created_at", { ascending: false }),
    q ? searchAll(q) : Promise.resolve(null),
  ]);
  const watched = new Set((watches ?? []).map((w: Watch) => w.url));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Watch Tower</h1>
        <p className="text-sm text-muted">Get a push the moment something comes back in stock.</p>
      </header>

      <form className="flex gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search Best Buy + Edmonton shops"
          aria-label="Search products"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <button className="rounded-xl bg-surface-2 px-4 py-2.5 font-semibold">Search</button>
      </form>

      {results && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">
            {results.hits.length > 30 ? `Top 30 of ${results.hits.length}` : results.hits.length} result
            {results.hits.length === 1 ? "" : "s"} for “{q}”
          </h2>
          {results.failed.length > 0 && (
            <p className="text-xs text-warn">Didn&apos;t answer: {results.failed.join(", ")}</p>
          )}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
            {results.hits.slice(0, 30).map((h) => (
              <li key={`${h.store}-${h.id}`} className="flex items-center gap-3 p-3">
                {h.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote store images, any host
                  <img src={h.image} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg bg-white object-contain" />
                )}
                <a href={h.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{h.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <StatusPill status={h.status} />
                    <span>{h.store}</span>
                    {h.price != null && <span className="font-semibold text-text">{money(h.price)}</span>}
                  </p>
                </a>
                {watched.has(h.url) ? (
                  <span className="text-xs font-semibold text-muted">Watching</span>
                ) : (
                  <form action={watchUrl}>
                    <input type="hidden" name="url" value={h.url} />
                    <button className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-text">Watch</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {results.hits.length === 0 && <p className="text-sm text-muted">Nothing found. Try fewer words.</p>}
        </section>
      )}

      <AddWatchForm />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Watching ({watches?.length ?? 0})</h2>
        {!watches?.length ? (
          <p className="rounded-2xl bg-surface p-6 text-center text-muted">Nothing yet. Search or paste a link above.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
            {(watches as Watch[]).map((w) => {
              const blocked = w.fail_count >= BLOCKED_AFTER;
              return (
                <li key={w.id} className="flex items-center gap-3 p-3">
                  <a href={w.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{w.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {w.store}
                      {w.price != null && <> · <span className="font-semibold text-text">{money(w.price)}</span></>} · checked{" "}
                      {ago(w.last_checked)}
                    </p>
                  </a>
                  <StatusPill status={blocked ? "blocked" : w.status === "error" ? "unknown" : w.status} />
                  <form action={removeWatch.bind(null, w.id)}>
                    <button aria-label={`Stop watching ${w.name}`} className="rounded-lg px-2 py-1 text-lg text-muted">
                      ×
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
