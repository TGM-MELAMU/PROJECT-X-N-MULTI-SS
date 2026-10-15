"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/auth/Field";
import { placeOrderAction, type CheckoutState } from "@/app/actions/checkout";
import { PROVINCES } from "@/lib/provinces";

export function CheckoutForm({ defaults }: { defaults: Record<string, string> }) {
  const [s, action, pending] = useActionState(placeOrderAction, {} as CheckoutState);
  const v = { ...defaults, ...s.values };
  return (
    <form action={action} className="space-y-4" noValidate>
      {s.error && (
        <p role="alert" className="rounded-control bg-red-50 px-3 py-2.5 text-sm text-sale-dark ring-1 ring-inset ring-red-200">{s.error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recipient name" name="recipientName" autoComplete="name" required defaultValue={v.recipientName} error={s.fields?.recipientName} />
        <Field label="Contact number" name="contactNumber" type="tel" autoComplete="tel" required defaultValue={v.contactNumber} error={s.fields?.contactNumber} hint="The courier may call this number." />
      </div>
      <Field label="Street address" name="line1" autoComplete="address-line1" required defaultValue={v.line1} error={s.fields?.line1} />
      <Field label="Apartment, suite or building" name="line2" autoComplete="address-line2" required={false} defaultValue={v.line2} error={s.fields?.line2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City or town" name="city" autoComplete="address-level2" required defaultValue={v.city} error={s.fields?.city} />
        <Field label="Postal code" name="postalCode" inputMode="numeric" autoComplete="postal-code" required defaultValue={v.postalCode} error={s.fields?.postalCode} />
      </div>
      <div>
        <label htmlFor="province" className="mb-1.5 block text-sm font-medium">Province</label>
        <select
          id="province"
          name="province"
          defaultValue={v.province ?? ""}
          aria-invalid={s.fields?.province ? true : undefined}
          className="h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        >
          <option value="" disabled>Choose a province</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {s.fields?.province && <p className="mt-1 text-sm text-sale-dark">{s.fields.province}</p>}
      </div>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="saveAddress" defaultChecked={v.saveAddress !== "off"} className="h-4 w-4 accent-brand-700" />
        Save this address for next time
      </label>
      <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-64" disabled={pending}>
        {pending ? "Placing order…" : "Place order and pay"}
      </Button>
      <p className="text-xs text-ink-muted">You'll pay securely on PayFast next. Your order is only confirmed once payment goes through.</p>
    </form>
  );
}
