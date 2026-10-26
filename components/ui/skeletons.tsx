/** Shared loading placeholders for listings / detail first paint (PX-B01 / PX-B02). */

export function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-forest/10 bg-white">
      <div className="aspect-[4/3] bg-cream" />
      <div className="space-y-2 p-4">
        <div className="h-5 w-1/2 rounded bg-cream" />
        <div className="h-4 w-3/4 rounded bg-cream" />
        <div className="h-3 w-full rounded bg-cream" />
      </div>
    </div>
  );
}

export function GridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-8 md:grid-cols-2 md:gap-6 md:px-6 xl:grid-cols-3 xl:gap-8 xl:px-8">
      {Array.from({ length: n }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-6 px-4 py-8 md:px-6 xl:grid-cols-[1.4fr_0.8fr] xl:gap-12 xl:px-8">
      <div className="aspect-[4/3] rounded-2xl bg-cream md:aspect-[16/10]" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded bg-cream" />
        <div className="h-10 w-1/2 rounded bg-cream" />
        <div className="h-24 rounded-2xl bg-cream" />
        <div className="h-12 rounded-full bg-cream" />
      </div>
    </div>
  );
}
