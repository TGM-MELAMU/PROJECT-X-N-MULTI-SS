"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { changePasswordAction, updateProfileAction } from "@/app/actions/account";
import type { AuthState } from "@/app/actions/auth";
import { Field, FormError, PasswordField } from "@/components/auth/Field";

const initial: AuthState = {};

function Saved({ show, children }: { show?: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <p role="status" className="rounded-control bg-brand-50 px-3 py-2.5 text-sm text-brand-900 ring-1 ring-inset ring-brand-200">
      {children}
    </p>
  );
}

export function ProfileForm({ user }: { user: { firstName: string; lastName: string; phone: string | null; email: string } }) {
  const [s, action, pending] = useActionState(updateProfileAction, initial);
  const v = s.values;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Saved show={s.done}>Your details have been saved.</Saved>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required defaultValue={v?.firstName ?? user.firstName} error={s.fields?.firstName} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required defaultValue={v?.lastName ?? user.lastName} error={s.fields?.lastName} />
      </div>
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" required={false} defaultValue={v?.phone ?? user.phone ?? ""} error={s.fields?.phone} hint="Used only for delivery questions." />
      <Field label="Email" name="email" type="email" value={user.email} readOnly disabled hint="To change your email address, contact us." />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [s, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={s.error} />
      <PasswordField label="Current password" name="current" autoComplete="current-password" required error={s.fields?.current} />
      <PasswordField label="New password" name="password" autoComplete="new-password" required error={s.fields?.password} hint="At least 8 characters." />
      <PasswordField label="Repeat new password" name="confirm" autoComplete="new-password" required error={s.fields?.confirm} />
      <Button type="submit" disabled={pending}>{pending ? "Changing…" : "Change password"}</Button>
    </form>
  );
}
