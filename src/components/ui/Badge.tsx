import { cn } from "@/lib/cn";

type Tone = "new" | "sale" | "neutral" | "warning";

const tones: Record<Tone, string> = {
  new: "bg-brand-700 text-white",
  sale: "bg-sale text-white",
  neutral: "bg-surface-sunken text-ink-soft",
  warning: "bg-amber-100 text-amber-900",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[0.25rem] px-1.5 py-0.5 text-xs font-semibold leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
