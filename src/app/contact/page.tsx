import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/config/site";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${site.name} for product enquiries, bulk quotes and order support.`,
};

type Props = { searchParams: Promise<{ product?: string | string[] }> };

export default async function ContactPage({ searchParams }: Props) {
  const raw = (await searchParams).product;
  // Shown back to the visitor and placed in a mailto subject, so keep it short and plain.
  const product = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 120);
  const subject = product ? `Enquiry: ${product}` : "Website enquiry";
  const c = site.contact;

  return (
    <ContentPage title="Contact us" intro="Questions about a product, a bulk quote or an order? Get in touch and we'll come back to you.">
      {product && (
        <p role="note" className="mb-6 rounded-card bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-inset ring-brand-200">
          Enquiring about <strong>{product}</strong>. Mention it when you contact us, or use the email button below.
        </p>
      )}
      <ul className="space-y-4">
        <li className="flex gap-3">
          <Mail className="mt-1 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span>
            <span className="block font-semibold">Email</span>
            <a href={`mailto:${c.email}?subject=${encodeURIComponent(subject)}`} className="text-brand-700 underline underline-offset-4">
              {c.email}
            </a>
          </span>
        </li>
        <li className="flex gap-3">
          <Phone className="mt-1 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span>
            <span className="block font-semibold">Phone</span>
            <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-brand-700 underline underline-offset-4">
              {c.phone}
            </a>
          </span>
        </li>
        <li className="flex gap-3">
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span>
            <span className="block font-semibold">Address</span>
            {c.address}
          </span>
        </li>
        <li className="flex gap-3">
          <Clock className="mt-1 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span>
            <span className="block font-semibold">Hours</span>
            {c.hours}
          </span>
        </li>
      </ul>
    </ContentPage>
  );
}
