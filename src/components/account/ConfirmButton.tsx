"use client";

import { Button } from "@/components/ui/Button";

/** A submit button that asks "are you sure?" first. Without JavaScript the confirmation is skipped, so the server action must stay safe on its own (it is). */
export function ConfirmButton({ message, children, ...props }: { message: string; children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
