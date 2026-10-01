import { getJson, toNumber } from "../http";
import type { Listing, StockResult, StockStatus } from "../types";

const BASE = "https://www.bestbuy.ca";

interface BBProduct {
  sku: string;
  name: string;
  productUrl: string;
  salePrice: number | null;
  regularPrice: number | null;
  thumbnailImage: string | null;
  isMarketplace: boolean;
}

interface BBAvailability {
  sku: string;
  shipping?: { status?: string; purchasable?: boolean };
  pickup?: { status?: string; purchasable?: boolean };
}

export function skuFromUrl(url: string): string | null {
  return url.match(/bestbuy\.ca\/.*?\/(\d{6,8})(?:[/?#]|$)/)?.[1] ?? null;
}

/** First-party Best Buy products only: marketplace resellers are filtered out. */
export async function search(query: string, pageSize = 24): Promise<Listing[]> {
  const q = encodeURIComponent(query);
  const data = await getJson<{ products: BBProduct[] }>(
    `${BASE}/api/v2/json/search?query=${q}&lang=en-CA&page=1&pageSize=${pageSize}`,
  );
  const products = data.products.filter((p) => !p.isMarketplace && /^\d+$/.test(p.sku));
  const stock = await availability(products.map((p) => p.sku));
  return products.map((p) => ({
    id: p.sku,
    name: p.name,
    url: BASE + p.productUrl,
    store: "Best Buy",
    source: "bestbuy",
    price: toNumber(p.salePrice ?? p.regularPrice),
    image: p.thumbnailImage,
    status: stock.get(p.sku) ?? "unknown",
  }));
}

/** Purchasable for shipping or pickup counts as in stock. Up to 100 SKUs per call. */
export async function availability(skus: string[]): Promise<Map<string, StockStatus>> {
  const out = new Map<string, StockStatus>();
  for (let i = 0; i < skus.length; i += 100) {
    const chunk = skus.slice(i, i + 100);
    if (!chunk.length) continue;
    const data = await getJson<{ availabilities: BBAvailability[] }>(
      `${BASE}/ecomm-api/availability/products?accept=application%2Fvnd.bestbuy.standardproduct.v1%2Bjson` +
        `&accept-language=en-CA&postalCode=T5J&skus=${chunk.join("|")}`,
    );
    for (const a of data.availabilities) {
      out.set(a.sku, a.shipping?.purchasable || a.pickup?.purchasable ? "in" : "out");
    }
  }
  return out;
}

export async function check(sku: string): Promise<StockResult> {
  const status = (await availability([sku])).get(sku) ?? "unknown";
  return { status, price: null };
}
