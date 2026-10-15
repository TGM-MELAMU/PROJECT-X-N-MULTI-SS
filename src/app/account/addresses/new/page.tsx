import type { Metadata } from "next";
import { AddressForm } from "@/components/account/AddressForm";

export const metadata: Metadata = { title: "Add an address", robots: { index: false } };

export default function NewAddressPage() {
  return (
    <div>
      <h1 className="text-3xl">Add an address</h1>
      <div className="mt-6 max-w-xl rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
        <AddressForm />
      </div>
    </div>
  );
}
