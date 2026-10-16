import { Info } from "lucide-react";
import { site } from "@/config/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

/** Shared frame for text pages: breadcrumb, title, readable line length. */
export function ContentPage({
  title,
  intro,
  legal = false,
  children,
}: {
  title: string;
  intro?: string;
  /** Policy pages: shows the draft notice while `site.legalDraft` is true. */
  legal?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="shell py-5 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <div className="mt-4 max-w-3xl">
        <h1 className="text-3xl">{title}</h1>
        {intro && <p className="mt-3 text-lg text-ink-soft">{intro}</p>}
        {legal && site.legalDraft && (
          <p role="note" className="mt-5 flex gap-2.5 rounded-card bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-inset ring-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Draft. {site.legalName} will supply the final wording for this page before the shop opens, and it should be reviewed by a legal adviser.
            </span>
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-24 first:mt-0">
      <h2 className="text-xl">{title}</h2>
      <div className="mt-2 max-w-prose space-y-3 text-ink-soft">{children}</div>
    </section>
  );
}
