import { getText, toNumber } from "../http";
import type { Listing, StockResult } from "../types";

const BASE = "https://www.walmart.ca";

interface WMItem {
  __typename?: string;
  name?: string;
  usItemId?: string;
  canonicalUrl?: string;
  sellerType?: string;
  availabilityStatusV2?: { value?: string };
  priceInfo?: { linePrice?: string };
  imageInfo?: { thumbnailUrl?: string };
}

function nextData(html: string): any {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("Walmart page had no product data (likely a bot check)");
  return JSON.parse(m[1]);
}

/** Walmart serves /en/ip/<id> to us but bot-blocks the long /en/ip/<slug>/<id> form (tested 5/5 each way). */
export function shortUrl(urlOrPath: string): string {
  const id = new URL(urlOrPath, BASE).pathname.split("/").filter(Boolean).pop();
  if (!id) throw new Error("Couldn't find the Walmart item ID in that link");
  return `${BASE}/en/ip/${id}`;
}

/** Walmart-sold items only: marketplace resellers (sellerType EXTERNAL) are filtered out. */
export async function search(query: string): Promise<Listing[]> {
  const html = await getText(`${BASE}/en/search?q=${encodeURIComponent(query)}`, { curlFirst: true });
  const stacks: { items: WMItem[] }[] = nextData(html)?.props?.pageProps?.initialData?.searchResult?.itemStacks ?? [];
  return stacks
    .flatMap((s) => s.items)
    .filter((x) => x.name && x.usItemId && x.canonicalUrl && x.sellerType === "INTERNAL")
    .map((x) => ({
      id: x.usItemId!,
      name: x.name!,
      url: shortUrl(x.canonicalUrl!),
      store: "Walmart",
      source: "walmart" as const,
      price: toNumber(x.priceInfo?.linePrice),
      image: x.imageInfo?.thumbnailUrl ?? null,
      status: x.availabilityStatusV2?.value === "IN_STOCK" ? ("in" as const) : ("out" as const),
    }));
}

export async function check(url: string): Promise<StockResult> {
  const p = nextData(await getText(shortUrl(url), { curlFirst: true }))?.props?.pageProps?.initialData?.data?.product;
  if (!p?.availabilityStatus) throw new Error("Walmart product data missing");
  return {
    status: p.availabilityStatus === "IN_STOCK" ? "in" : "out",
    price: toNumber(p.priceInfo?.currentPrice?.price),
    name: p.name,
  };
}
