"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
  { label: "Categories", href: "/categories", icon: LayoutGrid },
  { label: "Account", href: "/account", icon: User },
  { label: "Cart", href: "/cart", icon: ShoppingCart },
] as const;

export function MobileTabBar({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-800 bg-brand-950 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium",
                  active ? "text-white" : "text-brand-200",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                {label}
                {href === "/cart" && cartCount > 0 && (
                  <span className="nums absolute right-[28%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[0.6rem] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
