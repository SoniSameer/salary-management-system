"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1 rounded-lg border bg-card/70 p-1 shadow-sm">
      <Link
        href="/employees"
        aria-current={pathname.startsWith("/employees") ? "page" : undefined}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none ${pathname.startsWith("/employees") ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted hover:text-foreground"}`}
      >
        Employees
      </Link>
      <Link
        href="/insights"
        aria-current={pathname.startsWith("/insights") ? "page" : undefined}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none ${pathname.startsWith("/insights") ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted hover:text-foreground"}`}
      >
        Insights
      </Link>
    </nav>
  );
}
