import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "./notify";

/** Consecutive failures before one "can't check" alert. */
const ALERT_AT = 3;

/** Record a source's run. Sends one low-priority alert when a source has failed ALERT_AT times in a row. */
export async function recordHealth(sb: SupabaseClient, key: string, error: Error | null, quiet = false) {
  const { data } = await sb.from("source_health").select("fail_count").eq("key", key).maybeSingle();
  const fails = error ? (data?.fail_count ?? 0) + 1 : 0;
  await sb.from("source_health").upsert({
    key,
    fail_count: fails,
    last_error: error?.message ?? null,
    ...(error ? {} : { last_ok: new Date().toISOString() }),
  });
  if (error && fails === ALERT_AT && !quiet) {
    await notify({
      title: `Can't check: ${key}`,
      message: `Failed ${fails} runs in a row (${error.message}). It'll keep trying.`,
      priority: 2,
      tags: ["warning"],
    });
  }
}
