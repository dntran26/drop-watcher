"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState<string | null, FormData>(login, null);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="passcode" className="sr-only">
        Passcode
      </label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        placeholder="Passcode"
        className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-center text-lg outline-none focus:border-accent"
      />
      <button disabled={pending} className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-text disabled:opacity-60">
        {pending ? "Checking…" : "Open"}
      </button>
      {error && <p className="text-center text-sm text-warn">{error}</p>}
    </form>
  );
}
