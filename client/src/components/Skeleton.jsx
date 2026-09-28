// client/src/components/Skeleton.jsx — loading state (A.5): the layout is already
// formed, so the page does not jump when the data arrives.
export function SkeletonBlock({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function CourtListSkeleton({ count = 3 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading courts" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading courts…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function CourtDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading court" className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <span className="sr-only">Loading court…</span>
      <SkeletonBlock className="h-7 w-1/2" />
      <SkeletonBlock className="h-4 w-1/4" />
      <div className="grid grid-cols-2 gap-4 pt-2">
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
      </div>
      <SkeletonBlock className="h-10 w-40" />
    </div>
  );
}
