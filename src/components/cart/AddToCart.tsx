"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { addToCartAction, type CartState } from "@/app/actions/cart";
import { cn } from "@/lib/cn";

const initial: CartState = {};

/**
 * Add-to-cart button. Guests who press it are sent to log in and come back to `back`.
 * With `withQuantity` it shows a quantity box (product page); cards add one at a time.
 */
export function AddToCart({
  variantId,
  back,
  size = "md",
  withQuantity = false,
  maxQuantity = 99,
  className,
}: {
  variantId: number;
  back: string;
  size?: "md" | "lg";
  withQuantity?: boolean;
  maxQuantity?: number;
  className?: string;
}) {
  const [state, action, pending] = useActionState(addToCartAction, initial);
  return (
    <form action={action} className={cn("space-y-2", className)}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="back" value={back} />
      <div className={cn("flex gap-2", withQuantity ? "flex-wrap items-stretch" : "")}>
        {withQuantity && (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Qty</span>
            <input
              type="number"
              name="quantity"
              min={1}
              max={Math.min(maxQuantity, 99)}
              defaultValue={1}
              inputMode="numeric"
              className="nums h-12 w-20 rounded-control border border-line-strong bg-surface px-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
            />
          </label>
        )}
        <button type="submit" disabled={pending} className={buttonClass({ size, className: withQuantity ? "flex-1 sm:flex-none sm:min-w-52" : "w-full" })}>
          <ShoppingCart className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </div>
      <div aria-live="polite" className="min-h-[1.25rem] text-sm">
        {state.ok && (
          <p className="flex flex-wrap items-center gap-x-2 text-brand-800">
            <Check className="h-4 w-4" aria-hidden /> {state.message}{" "}
            <Link href="/cart" className="font-medium underline underline-offset-2">View cart</Link>
          </p>
        )}
        {state.error && <p role="alert" className="text-sale-dark">{state.error}</p>}
      </div>
    </form>
  );
}
