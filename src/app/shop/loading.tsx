export default function ShopLoading() {
  return (
    <div className="shell py-6" aria-busy="true" aria-label="Loading products">
      <div className="h-4 w-40 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-4 h-9 w-64 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-surface-sunken" />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-72 animate-pulse rounded-card bg-surface-sunken" />
          ))}
        </ul>
      </div>
    </div>
  );
}
