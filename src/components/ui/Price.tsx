import { formatZar } from "@/lib/vat";
import { cn } from "@/lib/cn";

/**
 * VAT-inclusive price. Pass integer cents. When `wasCents` is higher, shows the old price struck through.
 * The "incl. VAT" note is part of the component so no screen can forget it (client requirement).
 */
export function Price({
  cents,
  wasCents,
  size = "md",
  showVatNote = true,
  from = false,
  className,
}: {
  cents: number;
  wasCents?: number | null;
  size?: "md" | "lg";
  showVatNote?: boolean;
  /** Show "From" before the price (products with several variants at different prices). */
  from?: boolean;
  className?: string;
}) {
  const onSale = wasCents != null && wasCents > cents;
  return (
    <div className={cn("nums", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {from && <span className="text-sm text-ink-muted">From</span>}
        <span className={cn("font-semibold text-ink", size === "lg" ? "text-2xl" : "text-base")}>
          {formatZar(cents)}
        </span>
        {onSale && (
          <span className="text-sm text-ink-muted line-through">
            <span className="sr-only">Was </span>
            {formatZar(wasCents)}
          </span>
        )}
      </div>
      {showVatNote && <span className="text-xs text-ink-muted">incl. VAT</span>}
    </div>
  );
}
