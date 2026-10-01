export interface Alert {
  title: string;
  message: string;
  url?: string;
  /** 5 = max (breaks through Do Not Disturb if allowed in the ntfy app), 3 = default, 2 = low. */
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
}

/** Push to the phone via ntfy. Without NTFY_TOPIC set, prints instead (local dry runs). */
export async function notify(a: Alert): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.log(`[dry-run alert] ${a.title} :: ${a.message.replace(/\n/g, " / ")}`);
    return;
  }
  // JSON publishing keeps accents (Pokémon) intact; header-based publishing is ASCII-only.
  const res = await fetch("https://ntfy.sh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      title: a.title,
      message: a.message,
      priority: a.priority ?? 3,
      tags: a.tags ?? [],
      ...(a.url ? { click: a.url } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ntfy responded ${res.status}`);
}
