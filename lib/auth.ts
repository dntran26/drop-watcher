import { createHash, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "dw_auth";

/** Cookie value: a hash of the passcode, so the passcode itself never sits in the browser. */
export function authToken(): string {
  const pass = process.env.APP_PASSCODE;
  if (!pass) throw new Error("APP_PASSCODE must be set");
  return createHash("sha256").update(`drop-watcher:${pass}`).digest("hex");
}

export function tokenMatches(value: string | undefined): boolean {
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(authToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passcodeMatches(input: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(process.env.APP_PASSCODE ?? "").digest();
  return !!process.env.APP_PASSCODE && timingSafeEqual(a, b);
}
