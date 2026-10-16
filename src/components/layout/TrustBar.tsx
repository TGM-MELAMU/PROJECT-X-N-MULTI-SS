import Link from "next/link";
import { Check } from "lucide-react";
import { site } from "@/config/site";
import { logoutAction } from "@/app/actions/auth";

export function TrustBar({ user = null }: { user?: { firstName: string; isAdmin?: boolean } | null }) {
  return (
    <div className="bg-brand-950 text-brand-100">
      <div className="shell flex h-9 items-center justify-between gap-6 text-xs">
        <ul
          // Scrolls sideways on narrow screens, so it must be reachable by keyboard (arrow keys scroll it once focused).
          tabIndex={0}
          aria-label="Why shop with us"
          className="flex min-w-0 gap-5 overflow-x-auto whitespace-nowrap rounded-sm [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 [&::-webkit-scrollbar]:hidden">
          {site.trust.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-brand-300" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <Link href="/account/orders" className="hover:text-white">
            Track order
          </Link>
          <span className="h-3 w-px bg-brand-700" aria-hidden />
          {user ? (
            <>
              {user.isAdmin && <Link href="/admin" className="font-semibold text-white hover:underline">Admin</Link>}
              <Link href="/account" className="hover:text-white">Hi, {user.firstName}</Link>
              <form action={logoutAction}>
                <button type="submit" className="hover:text-white">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">Log in</Link>
              <Link href="/register" className="hover:text-white">Register</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
