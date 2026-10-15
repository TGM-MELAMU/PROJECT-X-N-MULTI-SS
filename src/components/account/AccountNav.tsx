"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Profile & password" },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map((i) => {
          const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium",
                  active ? "bg-brand-700 text-white" : "text-ink-soft hover:bg-brand-50 hover:text-brand-900",
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
