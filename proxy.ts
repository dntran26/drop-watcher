import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, tokenMatches } from "./lib/auth";

/** Optimistic gate: send anyone without the passcode cookie to /login. Server actions re-check. */
export function proxy(request: NextRequest) {
  if (tokenMatches(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the login page, Next internals and the files a home-screen install fetches.
  matcher: ["/((?!login|_next/|icon|apple-icon|manifest.webmanifest).*)"],
};
