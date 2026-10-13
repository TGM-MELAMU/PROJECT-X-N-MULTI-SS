import { ButtonLink } from "@/components/ui/Button";
import { HeroArt } from "./HeroArt";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="hex-lattice relative isolate overflow-hidden rounded-card bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white"
    >
      <div className="grid items-center gap-6 px-6 py-10 sm:px-10 md:grid-cols-[1.4fr_1fr] md:py-12 lg:px-12">
        <div>
          <h1 id="hero-title" className="text-[2rem]/[1.1] font-semibold tracking-tight text-white sm:text-[2.25rem]/[1.1] md:text-[2rem]/[1.1] lg:text-[2.6rem]/[1.08]">
            <span className="block">Equip your lab.</span>
            <span className="block">Empower your work.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-brand-100">
            Laboratory and medical supplies for professionals who care about precision. Prices include VAT.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/shop" size="lg" variant="secondary" className="bg-white hover:bg-brand-50">
              Explore products
            </ButtonLink>
            <ButtonLink
              href="/shop?category=special-offers"
              size="lg"
              variant="ghost"
              className="text-white ring-1 ring-inset ring-white/30 hover:bg-white/10 hover:text-white"
            >
              View special offers
            </ButtonLink>
          </div>
        </div>
        <HeroArt className="mx-auto w-full max-w-[15rem] sm:max-w-sm md:max-w-none" />
      </div>
    </section>
  );
}
