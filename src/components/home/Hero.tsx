import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate min-h-[380px] overflow-hidden rounded-card bg-brand-950 text-white shadow-lift flex items-center md:min-h-[420px]"
    >
      {/* Background Image: hero-banner.jpg */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pictures/hero-banner.jpg"
          alt="Precision laboratory glassware and equipment"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-center md:object-right"
        />
        {/* Egyptian Blue gradient overlay ensuring crystal-clear text readability on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/90 to-brand-950/20 md:w-[65%]" />
        <div className="absolute inset-0 bg-brand-950/40 md:hidden" />
      </div>

      <div className="relative z-10 w-full px-6 py-10 sm:px-10 md:py-14 lg:px-12">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-brand-200 backdrop-blur-md ring-1 ring-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            Precision Laboratory Supplies
          </div>
          <h1 id="hero-title" className="text-[2.2rem]/[1.1] font-bold tracking-tight text-white sm:text-[2.5rem]/[1.1] md:text-[2.75rem]/[1.08] lg:text-[3rem]/[1.06] drop-shadow-sm">
            <span className="block">Equip your lab.</span>
            <span className="block text-brand-300">Empower your work.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-brand-100 sm:text-lg drop-shadow-sm">
            Laboratory and medical supplies for professionals who care about precision. Prices include VAT.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <ButtonLink
              href="/shop"
              size="lg"
              className="bg-brand-600 text-white font-semibold shadow-md ring-1 ring-white/20 hover:bg-brand-500"
            >
              Explore products
            </ButtonLink>
            <ButtonLink
              href="/shop?category=special-offers"
              size="lg"
              variant="ghost"
              className="text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm hover:bg-white/15 hover:text-white font-medium"
            >
              View special offers
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
