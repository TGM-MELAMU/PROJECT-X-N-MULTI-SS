"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  forgotPasswordAction, loginAction, registerAction, resetPasswordAction, type AuthState,
} from "@/app/actions/auth";
import { Field, FormError, PasswordField } from "./Field";

const initial: AuthState = {};

function qs(next?: string) {
  return next ? `?next=${encodeURIComponent(next)}` : "";
}

export function LoginForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={s.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={s.values?.email} error={s.fields?.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" required error={s.fields?.password} />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-brand-700 underline underline-offset-2">Forgot your password?</Link>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Logging in…" : "Log in"}</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState(registerAction, initial);
  const v = s.values;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={s.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required defaultValue={v?.firstName} error={s.fields?.firstName} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required defaultValue={v?.lastName} error={s.fields?.lastName} />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={v?.email} error={s.fields?.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" required={false} defaultValue={v?.phone} error={s.fields?.phone} hint="Used only for delivery questions." />
      <PasswordField label="Password" name="password" autoComplete="new-password" required error={s.fields?.password} hint="At least 8 characters." />
      <div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="acceptTerms" required defaultChecked={v?.acceptTerms === "on"} className="mt-0.5 h-4 w-4 accent-brand-700" aria-invalid={s.fields?.acceptTerms ? true : undefined} />
          <span>
            I accept the <Link href="/terms" target="_blank" className="text-brand-700 underline underline-offset-2">terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="text-brand-700 underline underline-offset-2">privacy policy</Link>.
          </span>
        </label>
        {s.fields?.acceptTerms && <p className="mt-1 text-sm text-sale-dark">{s.fields.acceptTerms}</p>}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-sm text-ink-soft">
        Already registered? <Link href={`/login${qs(next)}`} className="text-brand-700 underline underline-offset-2">Log in</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, pending] = useActionState(forgotPasswordAction, initial);
  if (s.done) {
    return (
      <div role="status" className="space-y-3 text-ink-soft">
        <p className="font-medium text-ink">Check your email</p>
        <p>
          If <strong>{s.values?.email}</strong> has an account, we've sent a link to choose a new password. It works for 1 hour.
          Check your spam folder if it doesn't arrive in a few minutes.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={s.values?.email} error={s.fields?.email} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={s.error} />
      {s.error && <p className="text-sm"><Link href="/forgot-password" className="text-brand-700 underline underline-offset-2">Request a new link</Link></p>}
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" name="password" autoComplete="new-password" required error={s.fields?.password ?? s.fields?.token} hint="At least 8 characters." />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save new password"}</Button>
    </form>
  );
}
