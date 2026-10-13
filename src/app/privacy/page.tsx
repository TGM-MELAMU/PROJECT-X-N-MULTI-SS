import type { Metadata } from "next";
import { site } from "@/config/site";
import { ContentPage, Section } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy policy" legal intro={`How ${site.name} handles your personal information, in line with the Protection of Personal Information Act (POPIA).`}>
      <Section title="What we collect">
        <p>
          When you create an account or place an order: your name, email address, phone number, delivery addresses and order history. For business customers,
          we may also ask for company and VAT details for tax invoices.
        </p>
      </Section>
      <Section title="Payments">
        <p>
          Card and bank details are entered on our payment provider's secure page. {site.name} does not store them.
        </p>
      </Section>
      <Section title="How we use it">
        <p>To process and deliver your orders, send order updates, provide support, and, only if you opt in, send newsletters. You can unsubscribe at any time.</p>
      </Section>
      <Section title="Your rights">
        <p>You can ask to see, correct or delete the personal information we hold about you by contacting us at {site.contact.email}.</p>
      </Section>
    </ContentPage>
  );
}
