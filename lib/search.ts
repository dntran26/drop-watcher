import * as bestbuy from "./sources/bestbuy";
import * as shopify from "./sources/shopify";
import type { Listing } from "./types";

export interface SearchResult {
  hits: Listing[];
  /** Stores that didn't answer, so the page can say so instead of looking empty. */
  failed: string[];
}

/**
 * Best Buy plus the Edmonton shops, in parallel. Shops match words anywhere in the description, so
 * rank by how many query words are in the title, then in-stock first, then cheapest.
 */
export async function searchAll(query: string): Promise<SearchResult> {
  const jobs: [string, Promise<Listing[]>][] = [
    ["Best Buy", bestbuy.search(query, 12)],
    ...shopify.EDMONTON_SHOPS.map((s): [string, Promise<Listing[]>] => [s.name, shopify.search(s, query)]),
  ];
  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const hits = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = settled.flatMap((r, i) => (r.status === "rejected" ? [jobs[i][0]] : []));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const score = (l: Listing) => words.filter((w) => l.name.toLowerCase().includes(w)).length;
  hits.sort(
    (a, b) =>
      score(b) - score(a) ||
      Number(b.status === "in") - Number(a.status === "in") ||
      (a.price ?? 1e9) - (b.price ?? 1e9),
  );
  return { hits, failed };
}
