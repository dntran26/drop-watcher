/* eslint-disable @typescript-eslint/no-explicit-any -- parses other sites' untyped JSON/XML */
import * as cheerio from "cheerio";
import { getText, toNumber } from "../http";
import type { StockResult, StockStatus } from "../types";

/**
 * Any store that publishes schema.org Product data (most big retailers, Dyson included).
 * Reads Offer.availability: InStock / OutOfStock / PreOrder etc.
 */
export async function check(url: string): Promise<StockResult> {
  const $ = cheerio.load(await getText(url));
  const nodes: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      // Dyson and others put raw line breaks inside strings, which strict JSON rejects.
      const data = JSON.parse($(el).text().replace(/[\u0000-\u001f]+/g, " "));
      const stack = Array.isArray(data) ? data : [data];
      while (stack.length) {
        const n = stack.pop();
        if (!n || typeof n !== "object") continue;
        if (Array.isArray(n["@graph"])) stack.push(...n["@graph"]);
        if ([].concat(n["@type"]).includes("Product" as never)) nodes.push(n);
      }
    } catch {
      // Malformed blocks are common; skip them.
    }
  });

  const product = nodes.find((n) => n.offers);
  if (!product) throw new Error("No product stock data on this page");
  const offers: any[] = [].concat(product.offers?.offers ?? product.offers);
  const statuses = offers.map((o) => availability(o?.availability));
  const status: StockStatus = statuses.includes("in") ? "in" : statuses.includes("out") ? "out" : "unknown";
  const price = toNumber(offers[0]?.price ?? offers[0]?.lowPrice);
  return { status, price, name: product.name };
}

function availability(v: unknown): StockStatus {
  const s = String(v ?? "").toLowerCase();
  if (/instock|instoreonly|onlineonly|limitedavailability|preorder|presale/.test(s)) return "in";
  if (/outofstock|soldout|discontinued|backorder/.test(s)) return "out";
  return "unknown";
}
