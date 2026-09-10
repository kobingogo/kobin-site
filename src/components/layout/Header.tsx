"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/demos";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="group flex items-baseline gap-2 font-mono text-sm tracking-tight"
        >
          <span className="text-cyan-300 transition group-hover:text-cyan-200">
            KobinFlow
          </span>
          <span className="hidden text-zinc-500 sm:inline">/ jin kobin</span>
        </Link>

        <nav
          aria-label="主导航"
          className="flex max-w-[70vw] items-center gap-1 overflow-x-auto text-xs sm:max-w-none sm:gap-2 sm:text-sm"
        >
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-2 py-1.5 transition ${
                  active
                    ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/40"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
