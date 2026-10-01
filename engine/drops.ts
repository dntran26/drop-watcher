/**
 * Pokemon Drops job: diff each store's Pokemon stock against the last snapshot.
 * New listing or out -> in = a feed item, plus one grouped push per store.
 * Run: npm run drops   (every 5 min in GitHub Actions)
 */
import { db } from "../lib/db";
import { recordHealth } from "../lib/health";
import { notify } from "../lib/notify";
import * as bestbuy from "../lib/sources/bestbuy";
import * as shopify from "../lib/sources/shopify";
import * as walmart from "../lib/sources/walmart";
import type { Listing } from "../lib/types";

interface DropSource {
  key: string;
  name: string;
  home: string;
  /** Full catalog: an item missing from the fetch is sold out. Search results: missing means nothing. */
  full: boolean;
  fetch: () => Promise<Listing[]>;
  /** Blocks GitHub's servers some of the time: use it when it answers, never alert on its failures. */
  bestEffort?: boolean;
}

const SOURCES: DropSource[] = [
  ...shopify.EDMONTON_SHOPS.map((s) => ({
    key: s.key,
    name: s.name,
    home: `https://${s.domain}`,
    full: true,
    fetch: () => shopify.catalog(s),
  })),
  { key: "walmart", name: "Walmart", home: "https://www.walmart.ca", full: false, bestEffort: true, fetch: () => walmart.search("pokemon trading card") },
  { key: "bestbuy", name: "Best Buy", home: "https://www.bestbuy.ca", full: false, fetch: () => bestbuy.search("pokemon tcg", 100) },
];

const MAX_LINES = 6;

async function run(src: DropSource) {
  const sb = db();
  const listings = await src.fetch();
  const { data: snaps, error } = await sb
    .from("shop_snapshots")
    .select("product_id, available")
    .eq("shop", src.key)
    .range(0, 9999);
  if (error) throw error;

  const now = new Date().toISOString();
  const rows = listings.map((l) => ({
    shop: src.key,
    product_id: l.id,
    title: l.name,
    handle: l.url,
    url: l.url,
    image: l.image,
    available: l.status === "in",
    price: l.price,
    last_seen: now,
  }));

  if (!snaps.length) {
    if (rows.length) await upsert(rows);
    console.log(`${src.key}: seeded ${rows.length} products (no alerts on first run)`);
    return;
  }

  const before = new Map(snaps.map((s) => [s.product_id, s.available]));
  const fresh = listings.filter((l) => !before.has(l.id));
  const restocked = listings.filter((l) => before.get(l.id) === false && l.status === "in");

  if (src.full) {
    const present = new Set(listings.map((l) => l.id));
    const gone = snaps.filter((s) => s.available && !present.has(s.product_id)).map((s) => s.product_id);
    for (let i = 0; i < gone.length; i += 200) {
      await sb.from("shop_snapshots").update({ available: false }).eq("shop", src.key).in("product_id", gone.slice(i, i + 200));
    }
  }
  if (rows.length) await upsert(rows);

  const day = now.slice(0, 10);
  const feed = [
    ...fresh.map((l) => ({ l, kind: "new_listing" as const, url: l.url })),
    // Same product can restock again later; the fragment keeps each restock its own row.
    ...restocked.map((l) => ({ l, kind: "restock" as const, url: `${l.url}#restock-${day}` })),
  ];
  if (feed.length) {
    await sb.from("feed_items").upsert(
      feed.map(({ l, kind, url }) => ({
        tab: "pokemon",
        kind,
        source: src.name,
        title: l.name,
        url,
        price: l.price,
        image: l.image,
        published_at: now,
      })),
      { onConflict: "url", ignoreDuplicates: true },
    );
  }

  // Alert on anything you could buy right now. New-but-sold-out listings go to the feed only.
  const buyable = [...fresh.filter((l) => l.status === "in"), ...restocked];
  console.log(`${src.key}: ${listings.length} items, ${fresh.length} new, ${restocked.length} restocked`);
  if (!buyable.length) return;

  const lines = buyable
    .slice(0, MAX_LINES)
    .map((l) => `• ${l.name}${l.price ? ` · $${l.price}` : ""}${restocked.includes(l) ? " (restock)" : ""}`);
  if (buyable.length > MAX_LINES) lines.push(`+${buyable.length - MAX_LINES} more in the app`);
  await notify({
    title: buyable.length === 1 ? `Pokémon at ${src.name}` : `${buyable.length} Pokémon drops at ${src.name}`,
    message: lines.join("\n"),
    url: buyable.length === 1 ? buyable[0].url : src.home,
    priority: 4,
    tags: ["zap"],
  });
}

async function upsert(rows: object[]) {
  const sb = db();
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from("shop_snapshots").upsert(rows.slice(i, i + 500), { onConflict: "shop,product_id" });
    if (error) throw error;
  }
}

async function main() {
  const sb = db();
  for (const src of SOURCES) {
    try {
      await run(src);
      await recordHealth(sb, src.name, null);
    } catch (e) {
      console.log(`FAIL ${src.key}: ${(e as Error).message}`);
      await recordHealth(sb, src.name, e as Error, src.bestEffort);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
