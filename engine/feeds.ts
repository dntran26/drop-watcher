/**
 * Feeds job: pull news/deal/discussion feeds into the Pokemon and Buzz tabs.
 * Pushes only for actionable Pokemon posts (preorders live, restocks, RFD Pokemon deals).
 * Run: npm run feeds   (every 30 min in GitHub Actions)
 */
import { db, DEFAULT_KEYWORDS } from "../lib/db";
import { recordHealth } from "../lib/health";
import { notify } from "../lib/notify";
import { FEEDS, read, type FeedEntry, type KeywordSets } from "../lib/sources/feeds";

const ACTIONABLE = /preorder|pre-order|available now|in stock|restock|now live|on sale|release[sd]? today/i;

async function keywords(): Promise<KeywordSets> {
  const sb = db();
  const { data, error } = await sb.from("keywords").select("tab, word");
  if (error) throw error;
  if (!data.length) {
    const seed = Object.entries(DEFAULT_KEYWORDS).flatMap(([tab, words]) => words.map((word) => ({ tab, word })));
    await sb.from("keywords").insert(seed);
    return DEFAULT_KEYWORDS;
  }
  return {
    pokemon: data.filter((k) => k.tab === "pokemon").map((k) => k.word),
    buzz: data.filter((k) => k.tab === "buzz").map((k) => k.word),
  };
}

async function main() {
  const sb = db();
  const kw = await keywords();
  const cache = new Map<string, Promise<FeedEntry[]>>();

  for (const f of FEEDS) {
    if (!cache.has(f.url)) cache.set(f.url, read(f.url));
    let entries: FeedEntry[];
    try {
      entries = await cache.get(f.url)!;
      await recordHealth(sb, f.source, null);
    } catch (e) {
      console.log(`FAIL ${f.source}: ${(e as Error).message}`);
      await recordHealth(sb, f.source, e as Error, f.bestEffort);
      continue;
    }

    const kept = entries.filter((e) => e.url && e.title && f.keep(e, kw));
    if (!kept.length) {
      console.log(`${f.source} (${f.tab}): 0 of ${entries.length} kept`);
      continue;
    }

    // A source with no rows yet is seeding: store, don't push.
    const { count } = await sb
      .from("feed_items")
      .select("id", { count: "exact", head: true })
      .eq("source", f.source)
      .eq("tab", f.tab);
    const seeding = !count;

    const { data: inserted, error } = await sb
      .from("feed_items")
      .upsert(
        kept.map((e) => ({
          tab: f.tab,
          kind: f.kind,
          source: f.source,
          title: e.title,
          url: e.url,
          published_at: e.published_at,
        })),
        { onConflict: "url", ignoreDuplicates: true },
      )
      .select("title, url");
    if (error) throw error;
    console.log(`${f.source} (${f.tab}): ${kept.length} kept, ${inserted.length} new${seeding ? " (seeding)" : ""}`);

    if (seeding || f.tab !== "pokemon") continue;
    const push = inserted.filter((e) => f.kind === "deal" || ACTIONABLE.test(e.title));
    for (const e of push.slice(0, 3)) {
      await notify({ title: `Pokémon · ${f.source}`, message: e.title, url: e.url, priority: 3, tags: ["newspaper"] });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
