export function AuthShell({ title, intro, children, footer }: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="shell py-8 md:py-14">
      <div className="mx-auto w-full max-w-md rounded-card bg-surface p-6 shadow-card ring-1 ring-line md:p-8">
        <h1 className="text-2xl">{title}</h1>
        {intro && <p className="mt-2 text-ink-soft">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mx-auto mt-5 max-w-md text-center text-sm text-ink-soft">{footer}</p>}
    </div>
  );
}
