import Link from "next/link";
import { Check } from "lucide-react";
import { site } from "@/config/site";

export function TrustBar() {
  return (
    <div className="bg-brand-950 text-brand-100">
      <div className="shell flex h-9 items-center justify-between gap-6 text-xs">
        <ul className="flex min-w-0 gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <Link href="/login" className="hover:text-white">
            Log in
          </Link>
          <Link href="/register" className="hover:text-white">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
