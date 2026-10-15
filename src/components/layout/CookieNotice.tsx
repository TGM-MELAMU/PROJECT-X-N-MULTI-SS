"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "multiss-cookie-notice-seen";

/**
 * Tells visitors which cookies the site uses. MultiSS sets only essential cookies (login session and form
 * security) and no tracking, so this is a notice with an OK button, not a consent choice. If analytics or
 * marketing cookies are ever added, this must become an opt-in choice that blocks them until the visitor agrees.
 * It is not rendered on the server, so it never causes a mismatch, and it does not trap keyboard focus.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true); // storage blocked: show it every visit rather than never
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* the notice just shows again next visit */
    }
    setShow(false);
  }

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-2xl rounded-card bg-white p-4 shadow-lift ring-1 ring-line md:bottom-4"
    >
      <p className="text-sm text-ink-soft">
        We use only essential cookies, to keep you logged in and keep forms secure. No advertising or tracking cookies.{" "}
        <Link href="/privacy#cookies" className="text-brand-700 underline underline-offset-2">
          Read more
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 rounded-control bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
      >
        OK
      </button>
    </section>
  );
}
