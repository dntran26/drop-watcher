/**
 * Live checks against known products. Run: npm run probe
 * Each line prints what the checker read, so a wrong reading is visible, not just a pass/fail.
 */
import { resolve } from "../lib/check";
import * as bestbuy from "../lib/sources/bestbuy";
import { FEEDS, read } from "../lib/sources/feeds";
import * as shopify from "../lib/sources/shopify";
import * as walmart from "../lib/sources/walmart";

const links = [
  "https://www.bestbuy.ca/en-ca/product/dyson-airsmooth-styler-curling-iron-ceramic-pink-rose-gold/20068758",
  "https://www.bestbuy.ca/en-ca/product/dyson-airstrait-straightener-ceramic-pink-rose-gold/17732132",
  "https://www.dysoncanada.ca/en/hair-care/hot-brushes/airsmooth/ceramic-pink",
];

async function step(label: string, fn: () => Promise<string>) {
  try {
    console.log(`OK   ${label}: ${await fn()}`);
  } catch (e) {
    console.log(`FAIL ${label}: ${(e as Error).message}`);
  }
}

async function main() {
  for (const l of links) await step(`resolve ${new URL(l).hostname}`, async () => {
    const r = await resolve(l);
    return `${r.status.toUpperCase()} | ${r.source} | ${r.name ?? "?"} | $${r.price ?? "?"}`;
  });

  await step("walmart search + product", async () => {
    const hits = await walmart.search("pokemon elite trainer box");
    if (!hits.length) return "no Walmart-sold results";
    const r = await resolve(hits[0].url);
    return `${hits.length} Walmart-sold | first: ${r.status.toUpperCase()} ${r.name} $${r.price}`;
  });

  await step("bestbuy pokemon search", async () => {
    const hits = await bestbuy.search("pokemon tcg", 100);
    const inStock = hits.filter((h) => h.status === "in").length;
    return `${hits.length} first-party, ${inStock} in stock | e.g. ${hits[0]?.name}`;
  });

  for (const shop of shopify.EDMONTON_SHOPS) await step(`shop ${shop.key}`, async () => {
    const items = await shopify.catalog(shop);
    const inStock = items.filter((i) => i.status === "in").length;
    return `${items.length} sealed, ${inStock} in stock | e.g. ${items[0]?.name} $${items[0]?.price}`;
  });

  await step("shopify search (taps 'elite trainer')", async () => {
    const hits = await shopify.search(shopify.EDMONTON_SHOPS[1], "elite trainer");
    return `${hits.length} hits | ${hits[0]?.status.toUpperCase()} ${hits[0]?.name} $${hits[0]?.price}`;
  });

  await step("shopify single product", async () => {
    const [first] = await shopify.catalog(shopify.EDMONTON_SHOPS[1]);
    const r = await resolve(first.url);
    return `${r.status.toUpperCase()} | ${r.source} | ${r.name} | $${r.price} (catalog said ${first.status})`;
  });

  const seen = new Set<string>();
  for (const f of FEEDS) {
    if (seen.has(f.url)) continue;
    seen.add(f.url);
    await step(`feed ${f.source}`, async () => {
      const entries = await read(f.url);
      const e = entries[0];
      return `${entries.length} entries | ${e?.title.slice(0, 60)} | ${e?.published_at} | ${e?.url.slice(0, 50)}`;
    });
  }
}

main();
