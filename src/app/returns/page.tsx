import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Returns and refunds" };

export default function ReturnsPage() {
  return (
    <ContentPage title="Returns and refunds" legal intro="What to do if something arrives damaged, wrong or unsuitable.">
      <Section title="Returning a product">
        <p>To be supplied by Multi Success Supplies, including which products (for example chemicals, reagents and sterile consumables) can't be returned.</p>
      </Section>
      <Section title="Refunds">
        <p>To be supplied by Multi Success Supplies.</p>
      </Section>
    </ContentPage>
  );
}
