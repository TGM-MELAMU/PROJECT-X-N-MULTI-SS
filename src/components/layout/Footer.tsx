import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/config/site";
import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/shop" },
  { label: "About us", href: "/about" },
  { label: "Contact us", href: "/contact" },
];

const customerService = [
  { label: "Track order", href: "/account/orders" },
  { label: "Delivery information", href: "/delivery" },
  { label: "Returns and refunds", href: "/returns" },
  { label: "Terms and conditions", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
];

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

const linkClass = "text-sm text-brand-100 hover:text-white hover:underline underline-offset-4";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-950 text-brand-100">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr_1.3fr]">
        <div className="max-w-xs">
          <Logo light />
          <p className="mt-4 text-sm text-brand-200">
            {site.legalName} supplies laboratory and medical equipment, consumables, chemicals and reagents across South Africa.
          </p>
        </div>

        <Column title="Quick links">
          <ul className="space-y-2">
            {quickLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Customer service">
          <ul className="space-y-2">
            {customerService.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Contact us">
          <ul className="space-y-2.5 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              {site.contact.address}
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {site.contact.phone}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <a href={`mailto:${site.contact.email}`} className="hover:text-white">
                {site.contact.email}
              </a>
            </li>
            <li className="pl-[1.625rem] text-brand-200">{site.contact.hours}</li>
          </ul>
        </Column>

        <Column title="Newsletter">
          <p className="mb-3 text-sm text-brand-200">Get new stock and special offers by email.</p>
          <NewsletterForm />
        </Column>
      </div>

      <div className="border-t border-brand-800">
        <div className="shell flex flex-col gap-2 py-5 text-xs text-brand-200 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <p>Secure payments by PayFast</p>
        </div>
      </div>
    </footer>
  );
}
