import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Delivery information" };

export default function DeliveryPage() {
  return (
    <ContentPage title="Delivery information" legal intro="How and when your order reaches you.">
      <Section title="Delivery options and costs">
        <p>To be supplied by Multi Success Supplies once the delivery provider is confirmed.</p>
      </Section>
      <Section title="Delivery times">
        <p>To be supplied by Multi Success Supplies.</p>
      </Section>
      <Section title="Tracking your order">
        <p>Once ordering opens, you'll see your order status under Account, then Orders.</p>
      </Section>
    </ContentPage>
  );
}
