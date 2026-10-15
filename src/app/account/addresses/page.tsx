import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/session";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/account";
import { MAX_ADDRESSES } from "@/lib/account/constants";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/account/ConfirmButton";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requirePageUser();
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Addresses</h1>
        {addresses.length < MAX_ADDRESSES && <ButtonLink href="/account/addresses/new">Add an address</ButtonLink>}
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6 rounded-card bg-surface p-6 text-ink-soft shadow-card ring-1 ring-line">
          <p>You haven't saved a delivery address yet.</p>
          <p className="mt-1 text-sm">Saved addresses are offered at checkout, so you don't have to type them again.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
              <div className="mb-2 flex items-center gap-2">
                <strong>{a.label || "Address"}</strong>
                {a.isDefault && <Badge tone="new">Default</Badge>}
              </div>
              <address className="flex-1 text-sm not-italic text-ink-soft">
                {a.line1}<br />
                {a.line2 && <>{a.line2}<br /></>}
                {a.city}<br />
                {a.province}, {a.postalCode}<br />
                {a.country}
              </address>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={`/account/addresses/${a.id}`} variant="secondary" size="sm">Edit</ButtonLink>
                {!a.isDefault && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="ghost" size="sm">Make default</Button>
                  </form>
                )}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message="Delete this address?" variant="ghost" size="sm">Delete</ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
