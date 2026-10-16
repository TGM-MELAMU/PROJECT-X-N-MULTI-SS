"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";

const initial: NewsletterState = { status: "idle", message: "" };

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);

  return (
    <form action={action} noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex h-10 overflow-hidden rounded-control bg-brand-900 ring-1 ring-brand-700 focus-within:ring-2 focus-within:ring-brand-300">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          aria-describedby="newsletter-status"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-brand-300"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Subscribing" : "Subscribe"}
        </button>
      </div>
      <p
        id="newsletter-status"
        role="status"
        className={`mt-2 min-h-[1.25rem] text-xs ${state.status === "error" ? "text-red-300" : "text-brand-200"}`}
      >
        {state.message}
      </p>
      <p className="text-xs text-brand-200">
        By subscribing you agree to receive marketing email from us. Unsubscribe at any time. See our{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-white">privacy policy</a>.
      </p>
    </form>
  );
}
