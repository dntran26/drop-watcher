import { createClient } from "@supabase/supabase-js";

/** Server-side only: the secret key bypasses row level security. Never import into client components. */
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const DEFAULT_KEYWORDS = {
  pokemon: ["pokemon center", "prismatic", "151", "ultra premium", "elite trainer box"],
  buzz: [
    "air jordan 1",
    "jordan 3",
    "jordan 4",
    "jordan 5",
    "jordan 11",
    "travis scott",
    "off-white",
    "sb dunk",
    "a ma maniere",
    "sacai",
    "fragment",
    "kobe",
    "yeezy",
    "dyson",
  ],
};
