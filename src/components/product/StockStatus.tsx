import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalogue-types";

/** Stock as text plus an icon, never colour alone. */
export function StockStatus({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-sale-dark">
        <XCircle className="h-4 w-4" aria-hidden /> Out of stock
      </p>
    );
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
        <AlertTriangle className="h-4 w-4" aria-hidden /> Only {stock} left
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
      <CheckCircle2 className="h-4 w-4" aria-hidden /> In stock
    </p>
  );
}
