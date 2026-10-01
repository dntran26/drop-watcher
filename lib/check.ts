import * as bestbuy from "./sources/bestbuy";
import * as jsonld from "./sources/jsonld";
import * as shopify from "./sources/shopify";
import * as walmart from "./sources/walmart";
import type { Source, StockResult } from "./types";

export interface Resolved extends StockResult {
  source: Source;
  sku: string | null;
  store: string;
  url: string;
}

/** Work out which checker understands a pasted product link, and read it once. */
export async function resolve(raw: string): Promise<Resolved> {
  const url = new URL(raw.trim()).toString();
  const host = new URL(url).hostname.replace(/^www\./, "");

  if (host === "bestbuy.ca") {
    const sku = bestbuy.skuFromUrl(url);
    if (!sku) throw new Error("Couldn't find the Best Buy SKU in that link");
    const hit = (await bestbuy.search(sku, 5)).find((p) => p.id === sku);
    const r = await bestbuy.check(sku);
    return { ...r, name: hit?.name, price: hit?.price ?? null, source: "bestbuy", sku, store: "Best Buy", url };
  }
  if (host === "walmart.ca") {
    const short = walmart.shortUrl(url);
    return { ...(await walmart.check(short)), source: "walmart", sku: null, store: "Walmart", url: short };
  }
  if (/\/products\//.test(url) && (await shopify.isShopifyProduct(url))) {
    const p = await shopify.product(url);
    return { status: p.status, price: p.price, name: p.name, source: "shopify", sku: null, store: p.store, url: p.url };
  }
  const r = await jsonld.check(url);
  return { ...r, source: "jsonld", sku: null, store: host, url };
}

export async function checkStock(w: { source: Source; url: string; sku: string | null }): Promise<StockResult> {
  switch (w.source) {
    case "bestbuy":
      return bestbuy.check(w.sku ?? bestbuy.skuFromUrl(w.url) ?? "");
    case "walmart":
      return walmart.check(w.url);
    case "shopify":
      return shopify.check(w.url);
    case "jsonld":
      return jsonld.check(w.url);
  }
}

/** No network: which checker a link belongs to, for saving a watch when the first read is blocked. */
export function classify(raw: string): { source: Source; sku: string | null; store: string; url: string; name: string } {
  const u = new URL(raw.trim());
  const host = u.hostname.replace(/^www\./, "");
  const slug = u.pathname.split("/").filter((s) => s && !/^\d+$/.test(s) && !/^[A-Z0-9]{8,}$/.test(s)).pop() ?? host;
  const name = decodeURIComponent(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (host === "bestbuy.ca") return { source: "bestbuy", sku: bestbuy.skuFromUrl(u.href), store: "Best Buy", url: u.href, name };
  if (host === "walmart.ca") return { source: "walmart", sku: null, store: "Walmart", url: walmart.shortUrl(u.href), name };
  if (u.pathname.includes("/products/")) return { source: "shopify", sku: null, store: host, url: u.href.split("?")[0], name };
  return { source: "jsonld", sku: null, store: host, url: u.href, name };
}
