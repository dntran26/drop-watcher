import { getJson, toNumber } from "../http";
import type { Listing, StockResult } from "../types";

interface ShopifyVariant {
  available: boolean;
  price: string;
}
interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: ShopifyVariant[];
  images?: { src: string }[];
}

export interface Shop {
  key: string;
  name: string;
  domain: string;
  /** Pokemon sealed collections only; singles catalogs run to 30,000+ items. */
  collections: string[];
}

/** Edmonton card shops. Collection handles checked against each shop's /collections.json on 2026-10-01. */
export const EDMONTON_SHOPS: Shop[] = [
  {
    key: "swirl",
    name: "Swirl Cafe & Games",
    domain: "swirlyeg.com",
    collections: ["sealed-in-stock", "japanese-pokemon-booster-boxes", "japanese-pokemon-booster-packs"],
  },
  { key: "taps", name: "Taps Games", domain: "tapsgames.com", collections: ["pokemon-sealed"] },
  {
    key: "hpw",
    name: "HPW Cards",
    domain: "hpwcards.com",
    collections: [
      "pokemon-sealed-booster-box",
      "pokemon-sealed-booster-bundle",
      "pokemon-sealed-collection-box-copy",
      "pokemon-sealed-collection-box",
      "pokemon-sealed-elite-trainer-box",
      "pokemon-sealed-blister-pack",
      "japanese-pokemon-sealed",
    ],
  },
  { key: "commonbox", name: "Common Box Games", domain: "commonboxgames.com", collections: ["pokemon-sealed"] },
  { key: "eclipse", name: "Eclipse Games", domain: "eclipsegames.ca", collections: ["pokemon-sealed"] },
  { key: "203", name: "203 Collectibles", domain: "203collectibles.com", collections: ["pokemon-sealed-products"] },
];

/**
 * Shopify Markets hides products a store doesn't sell to the visitor's country. GitHub's
 * servers are in the US, where Taps Games showed 3 of its 78 sealed products; country=CA
 * restores the Canadian catalog (tested from GitHub's network 2026-10-01).
 */
const CA = "country=CA";

function toListing(shop: { name: string; domain: string }, p: ShopifyProduct): Listing {
  const prices = p.variants.map((v) => toNumber(v.price)).filter((n): n is number => n != null);
  return {
    id: String(p.id),
    name: p.title,
    url: `https://${shop.domain}/products/${p.handle}`,
    store: shop.name,
    source: "shopify",
    price: prices.length ? Math.min(...prices) : null,
    image: p.images?.[0]?.src ?? null,
    status: p.variants.some((v) => v.available) ? "in" : "out",
  };
}

/** Every product across a shop's watched collections, deduped. Throws if any page fails. */
export async function catalog(shop: Shop): Promise<Listing[]> {
  const seen = new Map<string, Listing>();
  for (const handle of shop.collections) {
    for (let page = 1; page <= 20; page++) {
      const { products } = await getJson<{ products: ShopifyProduct[] }>(
        `https://${shop.domain}/collections/${handle}/products.json?limit=250&page=${page}&${CA}`,
      );
      for (const p of products) seen.set(String(p.id), toListing(shop, p));
      if (products.length < 250) break;
    }
  }
  return [...seen.values()];
}

interface SuggestProduct {
  id: number;
  title: string;
  url: string;
  price: string;
  image: string | null;
  available: boolean;
}

/** Shopify's storefront search, which every Shopify store exposes. Includes stock and price. */
export async function search(shop: Shop, query: string): Promise<Listing[]> {
  const q = encodeURIComponent(query);
  const data = await getJson<{ resources: { results: { products: SuggestProduct[] } } }>(
    `https://${shop.domain}/search/suggest.json?q=${q}&resources[type]=product&resources[limit]=10&${CA}`,
  );
  return data.resources.results.products.map((p) => ({
    id: String(p.id),
    name: p.title,
    url: `https://${shop.domain}${p.url.split("?")[0]}`,
    store: shop.name,
    source: "shopify" as const,
    price: toNumber(p.price),
    image: p.image,
    status: p.available ? ("in" as const) : ("out" as const),
  }));
}

/** Any Shopify product URL. Uses /products/<handle>.js: the .json variant omits stock. Prices are in cents. */
export async function product(url: string): Promise<Listing> {
  const u = new URL(url);
  const handle = u.pathname.match(/\/products\/([^/?#]+)/)?.[1];
  if (!handle) throw new Error("Not a Shopify product URL");
  const p = await getJson<{
    id: number;
    title: string;
    handle: string;
    available: boolean;
    price: number;
    images: string[];
  }>(`${u.origin}/products/${handle}.js?${CA}`);
  const shop = EDMONTON_SHOPS.find((s) => u.hostname.endsWith(s.domain));
  const image = p.images?.[0] ?? null;
  return {
    id: String(p.id),
    name: p.title,
    url: `${u.origin}/products/${p.handle}`,
    store: shop?.name ?? u.hostname.replace(/^www\./, ""),
    source: "shopify",
    price: p.price / 100,
    image: image?.startsWith("//") ? "https:" + image : image,
    status: p.available ? "in" : "out",
  };
}

export async function check(url: string): Promise<StockResult> {
  const l = await product(url);
  return { status: l.status, price: l.price, name: l.name };
}

/** True when the URL is a product on a Shopify store (it answers /products/<handle>.js). */
export async function isShopifyProduct(url: string): Promise<boolean> {
  try {
    await product(url);
    return true;
  } catch {
    return false;
  }
}
