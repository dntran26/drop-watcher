"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Watch Tower", icon: "🔭" },
  { href: "/pokemon", label: "Pokémon", icon: "⚡" },
  { href: "/buzz", label: "Buzz", icon: "🔥" },
];

export default function TabBar() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active ? "text-accent" : "text-muted"}`}
              >
                <span aria-hidden className="text-xl leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
