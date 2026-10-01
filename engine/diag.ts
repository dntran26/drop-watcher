/** One-off: compare request variants from GitHub's (US) network. Delete after use. */
import { execFileSync } from "node:child_process";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const H = { "User-Agent": UA, "Accept-Language": "en-CA,en;q=0.9" };
const pause = () => new Promise((r) => setTimeout(r, 2500));

async function count(label: string, url: string, headers: Record<string, string> = {}) {
  try {
    const r = await fetch(url, { headers: { ...H, ...headers } });
    const t = await r.text();
    let n = "-";
    try { n = String(JSON.parse(t).products?.length); } catch {}
    console.log(`${label}: ${r.status} products=${n} bytes=${t.length} final=${r.url.slice(0, 80)}`);
  } catch (e) { console.log(`${label}: ERR ${(e as Error).message}`); }
  await pause();
}

function curl(label: string, url: string, extra: string[] = []) {
  try {
    const out = execFileSync("curl", ["-sSL", "--compressed", "-A", UA, ...extra, "-o", "/tmp/c", "-w", "%{http_code} %{size_download} %{url_effective}", url]).toString();
    const body = require("node:fs").readFileSync("/tmp/c", "utf8");
    console.log(`${label}: ${out.slice(0, 120)} nextdata=${/id="__NEXT_DATA__"/.test(body)} items=${(body.match(/<item>|<entry>/g) || []).length} title=${(body.match(/<title>([^<]*)/) || [])[1]?.slice(0, 50)}`);
  } catch (e) { console.log(`${label}: ERR ${(e as Error).message.slice(0, 100)}`); }
}

async function main() {
  const taps = "https://tapsgames.com/collections/pokemon-sealed/products.json?limit=250";
  await count("taps plain", taps);
  await count("taps cookie CA", taps, { Cookie: "localization=CA; cart_currency=CAD" });
  await count("taps ?country=CA", taps + "&country=CA");
  await count("taps /en-ca", "https://tapsgames.com/en-ca/collections/pokemon-sealed/products.json?limit=250");
  await count("taps all products", "https://tapsgames.com/products.json?limit=250");
  await count("swirl control", "https://swirlyeg.com/collections/sealed-in-stock/products.json?limit=250");

  for (const [k, u] of [
    ["rfd", "https://forums.redflagdeals.com/feed/forum/9"],
    ["hypebeast", "https://hypebeast.com/footwear/feed"],
    ["walmart search", "https://www.walmart.ca/en/search?q=pokemon%20trading%20card"],
    ["walmart item", "https://www.walmart.ca/en/ip/0ZL5ADQ5QA1A"],
  ]) {
    curl(`${k} curl`, u);
    curl(`${k} curl+accept`, u, ["-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "-H", "Accept-Language: en-CA,en;q=0.9"]);
    await pause();
  }
}
main();
