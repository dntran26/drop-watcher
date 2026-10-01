import { connection } from "next/server";
import { addKeyword, removeKeyword } from "@/app/actions";
import FeedList, { type FeedRow } from "@/components/FeedList";
import { db } from "@/lib/db";

export default async function Buzz() {
  // Live data on every visit; without this the page is prerendered once at build time.
  await connection();
  const [{ data: rows }, { data: words }] = await Promise.all([
    db()
      .from("feed_items")
      .select("id, kind, source, title, url, price, image, published_at, created_at")
      .eq("tab", "buzz")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(150),
    db().from("keywords").select("word").eq("tab", "buzz").order("word"),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Buzz</h1>
        <p className="text-sm text-muted">
          Sneaker news and RedFlagDeals, filtered to what you care about. Updated every 30 min.
        </p>
      </header>

      <details className="rounded-2xl bg-surface p-3">
        <summary className="cursor-pointer text-sm font-semibold">Hype keywords ({words?.length ?? 0})</summary>
        <p className="mt-2 text-xs text-muted">
          A post shows up here when its title mentions one of these. Changes apply from the next update.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(words ?? []).map(({ word }) => (
            <li key={word}>
              <form action={removeKeyword.bind(null, "buzz", word)}>
                <button
                  aria-label={`Remove ${word}`}
                  className="rounded-full bg-surface-2 px-3 py-1 text-sm"
                >
                  {word} <span className="text-muted">×</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addKeyword.bind(null, "buzz")} className="mt-3 flex gap-2">
          <input
            name="word"
            required
            minLength={2}
            maxLength={40}
            placeholder="e.g. jordan 4, new balance 990"
            aria-label="New keyword"
            className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-base outline-none focus:border-accent"
          />
          <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-text">Add</button>
        </form>
      </details>

      <FeedList rows={(rows ?? []) as FeedRow[]} empty="Nothing matching your keywords yet. Add a few more above." />
    </div>
  );
}
