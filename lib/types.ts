export type StockStatus = "in" | "out" | "unknown";
export type Source = "bestbuy" | "shopify" | "jsonld" | "walmart";

export interface StockResult {
  status: StockStatus;
  price: number | null;
  name?: string;
}

/** A product found by search, or listed in a store's catalog. */
export interface Listing {
  id: string; // store-specific product id or SKU
  name: string;
  url: string;
  store: string;
  source: Source;
  price: number | null;
  image: string | null;
  status: StockStatus;
}

export interface Watch {
  id: string;
  name: string;
  source: Source;
  url: string;
  sku: string | null;
  store: string | null;
  status: StockStatus | "error";
  price: number | null;
  fail_count: number;
  active: boolean;
  last_checked: string | null;
  last_changed: string | null;
  created_at: string;
}

export interface FeedItem {
  tab: "pokemon" | "buzz";
  kind: "new_listing" | "restock" | "news" | "deal" | "discussion";
  source: string;
  title: string;
  url: string;
  price?: number | null;
  image?: string | null;
  published_at?: string | null;
}
