import Link from "next/link";
import { cn } from "@/lib/cn";
import { adminHref } from "@/lib/admin/links";

/** The one-line message shown after an action (set by withFlash in the redirect). */
export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return error ? (
    <p role="alert" className="mb-5 rounded-control bg-red-50 px-4 py-3 text-sm text-sale-dark ring-1 ring-inset ring-red-200">{error}</p>
  ) : (
    <p role="status" className="mb-5 rounded-control bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-inset ring-brand-200">{notice}</p>
  );
}

export function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card bg-surface p-5 shadow-card ring-1 ring-line", className)}>
      {title && <h2 className="mb-4 text-lg">{title}</h2>}
      {children}
    </section>
  );
}

const inputCls =
  "h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm placeholder:text-ink-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30";

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
      {hint && <span className="ml-1 font-normal text-ink-muted">{hint}</span>}
    </label>
  );
}

export const TextInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(inputCls, p.className)} />;
export const SelectInput = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(inputCls, "pr-8", p.className)} />;
export const TextArea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cn(inputCls, "h-auto min-h-24 py-2", p.className)} />
);

/** Previous / Next links that keep the current filters. */
export function AdminPager({ path, query, page, pageCount }: { path: string; query: Record<string, string | number | null | undefined>; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const link = "rounded-control px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-line-strong hover:bg-brand-50";
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm">
      {page > 1 ? <Link className={link} href={adminHref(path, query, { page: page - 1 })}>Previous</Link> : <span />}
      <span className="text-ink-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link className={link} href={adminHref(path, query, { page: page + 1 })}>Next</Link> : <span />}
    </nav>
  );
}

export function Stat({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: "warn" }) {
  const inner = (
    <div className={cn("rounded-card bg-surface p-4 shadow-card ring-1 ring-line", href && "hover:bg-brand-50", tone === "warn" && "ring-amber-300")}>
      <p className="nums text-2xl font-semibold">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
