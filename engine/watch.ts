/**
 * Watch Tower job: check every active watch, alert on out -> in.
 * Run: npm run watch   (every 5 min in GitHub Actions)
 */
import { checkStock } from "../lib/check";
import { db } from "../lib/db";
import { notify } from "../lib/notify";
import type { Watch } from "../lib/types";

/** Consecutive failures before a single "can't check" alert. ~15 min at the 5-min cadence. */
const FAIL_ALERT_AT = 3;

async function main() {
  const sb = db();
  const { data: watches, error } = await sb.from("watches").select("*").eq("active", true);
  if (error) throw error;
  console.log(`checking ${watches.length} watches`);

  for (const w of watches as Watch[]) {
    const now = new Date().toISOString();
    try {
      const r = await checkStock(w);
      // "unknown" means the page answered but didn't say; keep the last real reading.
      const status = r.status === "unknown" ? w.status : r.status;
      const changed = status !== w.status;
      const backInStock = status === "in" && w.status === "out";

      await sb
        .from("watches")
        .update({
          status,
          price: r.price ?? w.price,
          fail_count: 0,
          last_checked: now,
          ...(changed ? { last_changed: now } : {}),
        })
        .eq("id", w.id);

      console.log(`${w.status} -> ${status}  ${w.name}`);
      if (backInStock) {
        await notify({
          title: `Back in stock: ${w.name}`,
          message: `${w.store ?? "Store"}${r.price ? ` · $${r.price}` : ""}. Tap to open.`,
          url: w.url,
          priority: 5,
          tags: ["rotating_light"],
        });
      }
    } catch (e) {
      const fails = w.fail_count + 1;
      await sb
        .from("watches")
        // Status keeps the last real reading so a recovery can still detect out -> in.
        // The app shows "can't check" from fail_count instead.
        .update({ fail_count: fails, last_checked: now })
        .eq("id", w.id);
      console.log(`FAIL (${fails}) ${w.name}: ${(e as Error).message}`);
      if (fails === FAIL_ALERT_AT) {
        await notify({
          title: `Can't check: ${w.name}`,
          message: `${w.store ?? "The store"} has blocked or changed the page (${(e as Error).message}). It'll keep trying.`,
          url: w.url,
          priority: 2,
          tags: ["warning"],
        });
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
