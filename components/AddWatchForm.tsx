"use client";

import { useActionState } from "react";
import { addWatch, type AddResult } from "@/app/actions";

export default function AddWatchForm() {
  const [state, action, pending] = useActionState<AddResult | null, FormData>(addWatch, null);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="url" className="text-sm font-medium text-muted">
        Or paste a product link
      </label>
      <div className="flex gap-2">
        <input
          id="url"
          name="url"
          type="url"
          inputMode="url"
          required
          placeholder="https://www.bestbuy.ca/en-ca/product/…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-text disabled:opacity-60"
        >
          {pending ? "Adding…" : "Watch"}
        </button>
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-in" : "text-warn"}`}>{state.message}</p>}
      <p className="text-xs text-muted">
        Works with Best Buy, Walmart, the Edmonton card shops and most store product pages.
      </p>
    </form>
  );
}
