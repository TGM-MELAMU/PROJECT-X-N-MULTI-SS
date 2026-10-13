import Link from "next/link";
import { ChevronDown, Menu, ShoppingCart, User } from "lucide-react";
import { categories, mainNav } from "@/config/site";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Logo } from "./Logo";
import { SearchForm } from "./SearchForm";
import { TrustBar } from "./TrustBar";

export function Header({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_0_var(--tw-shadow-color)] shadow-line">
      <TrustBar />

      <div className="shell flex items-center gap-3 py-3 md:gap-8">
        {/* Mobile menu: native <details>, so it needs no JavaScript. */}
        <details className="group relative md:hidden">
          <summary
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-control hover:bg-surface-muted [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </summary>
          <nav
            aria-label="Mobile"
            className="absolute left-[-1rem] top-12 z-50 max-h-[75vh] w-[min(22rem,100vw)] overflow-y-auto rounded-b-card bg-surface p-2 shadow-lift"
          >
            <ul>
              {mainNav.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-control px-3 py-2.5 text-sm font-medium hover:bg-brand-50">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-line px-3 pb-1 pt-3 text-xs text-ink-muted">Categories</p>
            <ul>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm hover:bg-brand-50"
                  >
                    <CategoryIcon name={c.icon} className="h-5 w-5 text-brand-600" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>

        <Logo />

        <div className="hidden flex-1 md:block">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-control px-2.5 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            <User className="h-[1.35rem] w-[1.35rem]" aria-hidden />
            <span className="hidden lg:inline">Account</span>
            <span className="sr-only lg:hidden">Account</span>
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-control px-2.5 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            <ShoppingCart className="h-[1.35rem] w-[1.35rem]" aria-hidden />
            <span className="hidden lg:inline">Cart</span>
            <span className="sr-only lg:hidden">Cart</span>
            {cartCount > 0 && (
              <span className="nums absolute right-0.5 top-0 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-sale px-1 text-[0.65rem] font-bold text-white">
                {cartCount}
                <span className="sr-only"> items in cart</span>
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="shell pb-3 md:hidden">
        <SearchForm />
      </div>

      {/* Main navigation bar (tablet and up) */}
      <nav aria-label="Main" className="hidden bg-brand-900 text-white md:block">
        <div className="shell flex h-11 items-stretch">
          <details className="group relative">
            <summary className="flex h-full w-60 cursor-pointer list-none items-center justify-between gap-2 bg-brand-950 px-4 text-sm font-semibold hover:bg-black/30 lg:w-64 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Menu className="h-4 w-4" aria-hidden />
                All categories
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="absolute left-0 top-full z-50 w-60 bg-surface py-1 text-ink shadow-lift lg:w-64">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop?category=${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-brand-50">
                    <CategoryIcon name={c.icon} className="h-5 w-5 text-brand-600" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <ul className="flex items-stretch lg:pl-4">
            {mainNav.map((l) => (
              <li key={l.href} className="flex">
                <Link
                  href={l.href}
                  className="flex items-center px-4 text-sm font-medium text-brand-50 transition-colors hover:bg-brand-800 hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
