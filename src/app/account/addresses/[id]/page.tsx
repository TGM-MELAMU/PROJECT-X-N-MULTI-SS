import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/session";
import { AddressForm } from "@/components/account/AddressForm";

export const metadata: Metadata = { title: "Edit address", robots: { index: false } };

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  // Filtered by owner: someone else's address id behaves exactly like one that doesn't exist.
  const address = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!address) notFound();

  return (
    <div>
      <h1 className="text-3xl">Edit address</h1>
      <div className="mt-6 max-w-xl rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
        <AddressForm address={address} />
      </div>
    </div>
  );
}
