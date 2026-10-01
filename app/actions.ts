"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authToken, passcodeMatches, tokenMatches } from "@/lib/auth";
import { classify, resolve } from "@/lib/check";
import { db } from "@/lib/db";

async function requireAuth() {
  const jar = await cookies();
  if (!tokenMatches(jar.get(AUTH_COOKIE)?.value)) redirect("/login");
}

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  if (!passcodeMatches(String(form.get("passcode") ?? ""))) return "That passcode didn't match.";
  const jar = await cookies();
  jar.set(AUTH_COOKIE, authToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

export interface AddResult {
  ok: boolean;
  message: string;
}

/** Add a product link. Reads it once so the list shows real status; if the store blocks us, saves it anyway. */
export async function addWatch(_prev: AddResult | null, form: FormData): Promise<AddResult> {
  await requireAuth();
  const raw = String(form.get("url") ?? "").trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: "That doesn't look like a link. Paste the full product URL." };
  }

  let row;
  let note = "";
  try {
    const r = await resolve(url.href);
    row = { name: r.name ?? classify(url.href).name, source: r.source, url: r.url, sku: r.sku, store: r.store, status: r.status, price: r.price, last_checked: new Date().toISOString() };
  } catch {
    const c = classify(url.href);
    row = { name: c.name, source: c.source, url: c.url, sku: c.sku, store: c.store, status: "unknown" };
    note = " The store didn't answer just now; the next check will try again.";
  }

  const { error } = await db().from("watches").upsert({ ...row, active: true, fail_count: 0 }, { onConflict: "url" });
  if (error) return { ok: false, message: `Couldn't save it: ${error.message}` };
  refresh();
  return { ok: true, message: `Watching ${row.name}.${note}` };
}

export async function removeWatch(id: string) {
  await requireAuth();
  await db().from("watches").delete().eq("id", id);
  refresh();
}

export async function addKeyword(tab: "pokemon" | "buzz", form: FormData) {
  await requireAuth();
  const word = String(form.get("word") ?? "").trim().toLowerCase();
  if (word.length < 2 || word.length > 40) return;
  await db().from("keywords").upsert({ tab, word }, { onConflict: "tab,word", ignoreDuplicates: true });
  refresh();
}

export async function removeKeyword(tab: "pokemon" | "buzz", word: string) {
  await requireAuth();
  await db().from("keywords").delete().eq("tab", tab).eq("word", word);
  refresh();
}

/** For one-tap "Watch" buttons on search results (no form state to show). */
export async function watchUrl(form: FormData) {
  await addWatch(null, form);
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
