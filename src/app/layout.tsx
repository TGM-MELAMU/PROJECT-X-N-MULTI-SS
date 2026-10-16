import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { siteUrl } from "@/lib/site-url";
import { site } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { getStoreCategories } from "@/lib/catalogue";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  // Each page's own address without filters, so /shop?sort=price and /shop are not seen as duplicates.
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: site.name, locale: "en_ZA", title: site.name, description: site.description },
  twitter: { card: "summary", title: site.name, description: site.description },
};

export const viewport: Viewport = {
  themeColor: "#1034a6",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const cartCount = user ? await getCartCount(user.id).catch(() => 0) : 0;
  const who = user ? { firstName: user.firstName, isAdmin: user.roles.includes("admin") } : null;
  // The menu comes from the database; if that fails the page still renders, just without the category list.
  const categories = await getStoreCategories().catch((err) => {
    console.error("layout: failed to load categories", err);
    return [];
  });

  return (
    <html lang="en-ZA">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift"
        >
          Skip to content
        </a>
        <Header cartCount={cartCount} user={who} categories={categories} />
        <main id="main" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileTabBar cartCount={cartCount} />
        <CookieNotice />
      </body>
    </html>
  );
}
