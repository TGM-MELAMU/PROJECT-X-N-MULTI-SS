import Link from "next/link";
import { site } from "@/config/site";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex flex-col leading-none" aria-label={`${site.name} home`}>
      <span className={`text-[1.65rem] font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Multi<span className={light ? "text-brand-300" : "text-brand-600"}>SS</span>
      </span>
      <span className={`mt-0.5 text-[0.6rem] font-medium ${light ? "text-brand-200" : "text-ink-muted"}`}>
        {site.tagline}
      </span>
    </Link>
  );
}
