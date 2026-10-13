import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Terms and conditions" };

export default function TermsPage() {
  return (
    <ContentPage title="Terms and conditions" legal intro="The terms that apply when you use this website and buy from us.">
      <Section title="Prices and VAT">
        <p>All prices are in South African rand (ZAR) and include VAT.</p>
      </Section>
      <Section title="Orders, payment and ownership">
        <p>To be supplied by Multi Success Supplies.</p>
      </Section>
      <Section title="Product information and regulated products">
        <p>To be supplied by Multi Success Supplies.</p>
      </Section>
      <Section title="Liability and governing law">
        <p>To be supplied by Multi Success Supplies.</p>
      </Section>
    </ContentPage>
  );
}
