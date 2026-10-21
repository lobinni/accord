"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Task hub" },
  { href: "/create", label: "Create accord" },
  { href: "/history", label: "Record" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`mono px-4 py-2 text-[11px] uppercase tracking-[0.18em] no-underline transition-colors ${
              active ? "text-[var(--mint)]" : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
            }`}
            style={active ? { boxShadow: "inset 0 -2px 0 var(--mint)" } : undefined}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
