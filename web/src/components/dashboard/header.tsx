"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function Header() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header className="flex h-14 items-center border-b border-white/[0.06] px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted" />}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted transition-colors hover:text-fg"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-fg">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];
  const segments = pathname.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);

  if (segments.length >= 1) {
    // projectId segment — we'll show as truncated UUID for now
    // The actual project name will be shown via the page component
    crumbs.push({
      label: "Project",
      href: segments.length > 1 ? `/dashboard/${segments[0]}` : undefined,
    });
  }

  if (segments.length >= 2) {
    crumbs.push({ label: "Variant" });
  }

  return crumbs;
}
