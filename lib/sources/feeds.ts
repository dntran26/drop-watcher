/* eslint-disable @typescript-eslint/no-explicit-any -- parses other sites' untyped JSON/XML */
import { XMLParser } from "fast-xml-parser";
import { FEED_ACCEPT, getText } from "../http";
import type { FeedItem } from "../types";

export interface FeedEntry {
  title: string;
  url: string;
  categories: string[];
  published_at: string | null;
}

export interface Feed {
  source: string;
  url: string;
  tab: FeedItem["tab"];
  kind: FeedItem["kind"];
  /** Keep an entry only if this returns true. `kw` is the tab's keyword list. */
  keep: (e: FeedEntry, kw: KeywordSets) => boolean;
  /** Reddit and similar sources that rate-limit: failures are expected, not alert-worthy. */
  bestEffort?: boolean;
}

export interface KeywordSets {
  pokemon: string[];
  buzz: string[];
}

const POKEMON = /pok[eé]mon|\btcg\b|booster|elite trainer|\betb\b/i;
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word match, so "jordan 1" doesn't fire on "jordan 11". */
const matches = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(^|[^a-z0-9])${escape(w.toLowerCase())}($|[^a-z0-9])`).test(text.toLowerCase()));

export const FEEDS: Feed[] = [
  {
    source: "PokeBeach",
    url: "https://www.pokebeach.com/forums/forums/-/index.rss",
    tab: "pokemon",
    kind: "news",
    keep: (e) => e.categories.includes("Front Page News"),
  },
  {
    source: "RedFlagDeals",
    url: "https://forums.redflagdeals.com/feed/forum/9",
    tab: "pokemon",
    kind: "deal",
    keep: (e, kw) => POKEMON.test(e.title) || matches(e.title, kw.pokemon),
  },
  {
    source: "RedFlagDeals",
    url: "https://forums.redflagdeals.com/feed/forum/9",
    tab: "buzz",
    kind: "deal",
    keep: (e, kw) => matches(e.title, kw.buzz),
  },
  {
    source: "Reddit",
    url: "https://www.reddit.com/r/PokemonTCG+PokemonTCGDeals+Edmonton/new/.rss?limit=50",
    tab: "pokemon",
    kind: "discussion",
    bestEffort: true,
    keep: (e) =>
      POKEMON.test(e.title) && /restock|drop|in stock|release|walmart|best buy|costco|edmonton|found/i.test(e.title),
  },
  ...["https://sneakernews.com/feed/", "https://www.nicekicks.com/feed/", "https://hypebeast.com/footwear/feed", "https://www.sneakerfiles.com/feed/"].map(
    (url): Feed => ({
      source: new URL(url).hostname.replace(/^www\./, "").split(".")[0].replace(/^./, (c) => c.toUpperCase()),
      url,
      tab: "buzz",
      kind: "news",
      keep: (e, kw) => matches(`${e.title} ${e.categories.join(" ")}`, kw.buzz),
    }),
  ),
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const text = (v: any): string => (v == null ? "" : typeof v === "object" ? String(v["#text"] ?? "") : String(v));

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .trim();

/** RSS 2.0 or Atom. */
export async function read(url: string): Promise<FeedEntry[]> {
  // An HTML Accept header gets some feeds (Hypebeast) to serve an empty bot check instead.
  const doc = parser.parse(await getText(url, { accept: FEED_ACCEPT }));
  if (!doc.rss?.channel && !doc.feed) throw new Error("Response wasn't a feed (likely a bot check)");
  const rss = doc.rss?.channel?.item;
  const atom = doc.feed?.entry;
  const items: any[] = [].concat(rss ?? atom ?? []);
  return items.map((i) => {
    const link = rss
      ? text(i.link)
      : ([].concat(i.link).find((l: any) => !l?.["@_rel"] || l["@_rel"] === "alternate") as any)?.["@_href"] ?? "";
    const date = i.pubDate ?? i.published ?? i.updated;
    return {
      title: decode(text(i.title)),
      url: link.trim(),
      categories: [].concat(i.category ?? []).map((c: any) => decode(c?.["@_term"] ?? text(c))),
      published_at: date ? new Date(text(date)).toISOString() : null,
    };
  });
}
