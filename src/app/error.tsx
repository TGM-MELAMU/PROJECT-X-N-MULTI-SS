"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell py-16 text-center">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">The page didn't load. Try again, and if it keeps happening, contact us.</p>
      {error.digest && <p className="nums mt-2 text-xs text-ink-muted">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go to home page
        </ButtonLink>
      </div>
    </div>
  );
}
