"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, className, ...input }: Props) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {input.required === false && <span className="ml-1 font-normal text-ink-muted">(optional)</span>}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-control border bg-surface px-3 text-base placeholder:text-ink-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30",
          error ? "border-sale" : "border-line-strong",
          className,
        )}
        {...input}
      />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-sale-dark">{error}</p>}
    </div>
  );
}

export function PasswordField({ label, error, hint, className, ...input }: Props) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-control border bg-surface pl-3 pr-11 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30",
            error ? "border-sale" : "border-line-strong",
            className,
          )}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-control text-ink-muted hover:text-ink"
        >
          {shown ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-sale-dark">{error}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control bg-red-50 px-3 py-2.5 text-sm text-sale-dark ring-1 ring-inset ring-red-200">
      {message}
    </p>
  );
}
