"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { saveAddressAction } from "@/app/actions/account";
import type { AuthState } from "@/app/actions/auth";
import { Field, FormError } from "@/components/auth/Field";
import { PROVINCES } from "@/lib/account/constants";

export type AddressValues = {
  id?: number; label?: string | null; line1?: string; line2?: string | null; city?: string;
  province?: string; postalCode?: string; isDefault?: boolean;
};

export function AddressForm({ address }: { address?: AddressValues }) {
  const [s, action, pending] = useActionState(saveAddressAction, {} as AuthState);
  const v = s.values;
  const f = s.fields ?? {};
  const wasDefault = address?.isDefault === true;
  // React resets a form's fields to their defaults when its action finishes, and it doesn't update a
  // <select>'s or checkbox's default afterwards, so a server-side error would clear the Province choice.
  // Remembering the choice and re-creating those two fields after each response avoids that.
  const [province, setProvince] = useState(address?.province ?? "");
  const [makeDefault, setMakeDefault] = useState(wasDefault);
  const lastResult = useRef(s);
  const round = useRef(0);
  if (lastResult.current !== s) {
    lastResult.current = s;
    round.current += 1;
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={s.error} />
      {address?.id && <input type="hidden" name="id" value={address.id} />}
      <Field label="Label" name="label" required={false} defaultValue={v?.label ?? address?.label ?? ""} error={f.label} hint='For example "Lab" or "Head office".' />
      <Field label="Street address" name="line1" autoComplete="address-line1" required defaultValue={v?.line1 ?? address?.line1} error={f.line1} />
      <Field label="Suburb, building or unit" name="line2" autoComplete="address-line2" required={false} defaultValue={v?.line2 ?? address?.line2 ?? ""} error={f.line2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City or town" name="city" autoComplete="address-level2" required defaultValue={v?.city ?? address?.city} error={f.city} />
        <Field label="Postal code" name="postalCode" inputMode="numeric" autoComplete="postal-code" maxLength={4} required defaultValue={v?.postalCode ?? address?.postalCode} error={f.postalCode} />
      </div>
      <div>
        <label htmlFor="province" className="mb-1.5 block text-sm font-medium">Province</label>
        <select
          key={`province-${round.current}`} id="province" name="province" required defaultValue={province} onChange={(e) => setProvince(e.target.value)} aria-invalid={f.province ? true : undefined}
          className="h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        >
          <option value="" disabled>Choose a province</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {f.province && <p className="mt-1 text-sm text-sale-dark">{f.province}</p>}
      </div>
      <p className="text-sm text-ink-muted">Country: South Africa. We currently deliver within South Africa only.</p>
      <label className="flex items-start gap-2.5 text-sm">
        <input
          key={`default-${round.current}`} type="checkbox" name="isDefault" className="mt-0.5 h-4 w-4 accent-brand-700"
          defaultChecked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} disabled={wasDefault}
        />
        <span>
          Use as my default delivery address
          {wasDefault && <span className="block text-ink-muted">This is your default. To change it, make another address the default.</span>}
        </span>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save address"}</Button>
        <Link href="/account/addresses" className={buttonClass({ variant: "secondary" })}>Cancel</Link>
      </div>
    </form>
  );
}
