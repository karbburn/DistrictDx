"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, BarChart3, BookOpen, Target, Database } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Map", icon: Map },
  { href: "/scatter", label: "Scatter", icon: Target },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/variables", label: "Variables", icon: Database },
  { href: "/methodology", label: "Methodology", icon: BookOpen },
] as const;

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header
      className="flex h-14 items-center justify-between border-b border-hairline bg-surface px-6 flex-shrink-0 z-50"
      role="banner"
    >
      <Link
        href="/"
        className="flex flex-col leading-none"
        aria-label="DistrictDx home"
      >
        <span className="font-display text-lg font-bold tracking-tight text-saffron hover:opacity-90 transition-opacity">
          DistrictDx
        </span>
        <a
          href="https://www.linkedin.com/in/sourabh-pradhan07/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-data text-[10px] text-muted hover:text-secondary transition-colors hidden sm:block"
        >
          Built by Sourabh
        </a>
      </Link>

      <nav aria-label="Main navigation" className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-data text-xs tracking-wide transition-colors min-h-[44px] ${
                isActive
                  ? "text-saffron bg-saffron/10"
                  : "text-secondary hover:text-primary hover:bg-surface-raised"
              }`}
            >
              <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
