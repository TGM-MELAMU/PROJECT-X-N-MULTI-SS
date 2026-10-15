"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

/** Posts the signed order details to PayFast. Submits by itself; the button is the no-JavaScript fallback. */
export function PayFastForm({ action, fields }: { action: string; fields: Array<[string, string]> }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.submit();
  }, []);
  return (
    <form ref={ref} action={action} method="post">
      {fields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Button type="submit" size="lg">Continue to PayFast</Button>
    </form>
  );
}
