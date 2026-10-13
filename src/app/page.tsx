import Link from "next/link";
import { ArrowRight, BadgeCheck, Headset, ShieldCheck, Sparkles, Tag, Truck, Trophy } from "lucide-react";
import { categories } from "@/config/site";
import { getFeaturedProducts, type ProductSummary } from "@/lib/catalogue";
import { CategoryRail } from "@/components/home/CategoryRail";
import { Hero } from "@/components/home/Hero";
import { ProductCard } from "@/components/product/ProductCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

// Products come from the database, so render per request (cache tuning comes later).
export const dynamic = "force-dynamic";

const promos = [
  { title: "New arrivals", text: "Our latest laboratory equipment.", href: "/shop?sort=newest", icon: Sparkles },
  { title: "Best sellers", text: "Most ordered by our customers.", href: "/shop?sort=popular", icon: Trophy },
  { title: "Special offers", text: "Reduced prices on selected products.", href: "/shop?category=special-offers", icon: Tag, offer: true },
] as const;

const assurances = [
  { icon: Truck, title: "Fast delivery", text: "Nationwide delivery to your door." },
  { icon: ShieldCheck, title: "Secure payments", text: "Safe and secure payments you can trust." },
  { icon: Headset, title: "Expert support", text: "Our team helps whenever you need us." },
  { icon: BadgeCheck, title: "Quality assurance", text: "Quality products, guaranteed." },
];

function SectionHeading({ id, title, href, linkText }: { id: string; title: string; href: string; linkText: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-xl sm:text-2xl">
        {title}
      </h2>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline underline-offset-4">
        {linkText}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  let featured: ProductSummary[] = [];
  let featuredFailed = false;
  try {
    featured = await getFeaturedProducts(8);
  } catch (err) {
    console.error("home: failed to load featured products", err);
    featuredFailed = true;
  }

  return (
    <div className="shell space-y-12 pt-5 md:pt-6">
      {/* Hero row: category rail (desktop) + hero + promos */}
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <CategoryRail className="hidden lg:block lg:self-start" />
        <div className="space-y-5">
          <Hero />
          <ul className="grid gap-3 sm:grid-cols-3">
            {promos.map(({ title, text, href, icon: Icon, ...rest }) => (
              <li key={title}>
                <Link
                  href={href}
                  className="group flex h-full items-center gap-4 rounded-card bg-surface-muted p-4 transition-colors hover:bg-brand-50"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      "offer" in rest ? "bg-sale text-white" : "bg-brand-700 text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-xs text-ink-muted">{text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Shop by category */}
      <section aria-labelledby="cat-title">
        <SectionHeading id="cat-title" title="Shop by category" href="/shop" linkText="View all categories" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((c) => {
            const offer = c.slug === "special-offers";
            return (
              <li key={c.slug}>
                <Link
                  href={`/shop?category=${c.slug}`}
                  className="flex h-full flex-col items-center gap-3 rounded-card bg-surface p-4 text-center shadow-card transition-shadow hover:shadow-lift"
                >
                  <CategoryIcon name={c.icon} className={`h-8 w-8 ${offer ? "text-sale" : "text-brand-600"}`} />
                  <span className="text-sm font-medium leading-tight">{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Featured products */}
      <section aria-labelledby="featured-title">
        <SectionHeading id="featured-title" title="Featured products" href="/shop" linkText="View all products" />
        {featuredFailed ? (
          <p className="rounded-card bg-surface-muted p-6 text-sm text-ink-soft">
            Products can't load right now. Refresh the page, or browse a category from the menu.
          </p>
        ) : featured.length === 0 ? (
          <p className="rounded-card bg-surface-muted p-6 text-sm text-ink-soft">
            No featured products yet. Check back soon, or browse all products.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Assurances */}
      <section aria-label="Why buy from MultiSS">
        <ul className="grid gap-px overflow-hidden rounded-card bg-line sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 bg-surface-muted p-5">
              <Icon className="mt-0.5 h-7 w-7 shrink-0 text-brand-600" strokeWidth={1.5} aria-hidden />
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-sm text-ink-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
