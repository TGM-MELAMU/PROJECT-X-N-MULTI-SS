import type { Metadata } from "next";
import { site } from "@/config/site";
import { ContentPage, Section } from "@/components/layout/ContentPage";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About us",
  description: `${site.legalName} supplies laboratory and medical equipment, consumables, chemicals and reagents in South Africa.`,
};

export default function AboutPage() {
  return (
    <ContentPage title="About us" intro={`${site.legalName}, trading as ${site.name}, is a South African supplier of laboratory and medical equipment.`}>
      <Section title="What we supply">
        <p>
          Laboratory equipment, medical equipment, chemicals and reagents, consumables, safety and protection gear, glassware and laboratory furniture, for
          professionals who need dependable products.
        </p>
      </Section>
      <Section title="Buying from us online">
        <p>
          Browse the full range without an account. Create an account to order, save your delivery addresses and see your order history. All prices on the
          site include VAT.
        </p>
        <p>Looking for a product that isn't listed, or ordering in bulk? Our team will help.</p>
      </Section>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/shop">Browse products</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </div>
    </ContentPage>
  );
}
