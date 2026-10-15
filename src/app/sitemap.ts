import type { MetadataRoute } from "next";
import { getCatalogue, getStoreCategories } from "@/lib/catalogue";
import { siteUrl } from "@/lib/site-url";

// Reads the database, so it is built when asked for (and cached by the platform), never at build time.
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/shop", "/categories", "/about", "/contact", "/delivery", "/returns", "/terms", "/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${base}${p === "/" ? "" : p}`,
    changeFrequency: p === "/" || p === "/shop" ? "daily" : "monthly",
    priority: p === "/" ? 1 : p === "/shop" ? 0.9 : 0.5,
  }));

  try {
    const [categories, products] = await Promise.all([getStoreCategories(), getCatalogue()]);
    for (const c of categories) {
      entries.push({ url: `${base}/shop?category=${encodeURIComponent(c.slug)}`, changeFrequency: "daily", priority: 0.7 });
    }
    for (const p of products) {
      entries.push({ url: `${base}/product/${encodeURIComponent(p.slug)}`, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch (err) {
    // A database hiccup must not turn the sitemap into an error page: serve the fixed pages.
    console.error("sitemap: could not load the catalogue", err);
  }
  return entries.slice(0, 50_000); // the sitemap standard's limit per file
}
