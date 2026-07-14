// Route-level loading UI for every dashboard page. The dashboard pages are
// server components that query MongoDB before rendering, so without this
// file a navigation click gives no feedback until the data arrives -- the
// app feels frozen on slow connections (most of the audience is on mobile
// data). Next streams this skeleton instantly, then swaps in the page.
// Uses the shared .skeleton shimmer from globals.css, which also respects
// prefers-reduced-motion.
export default function DashboardLoading() {
  return (
    <div className="max-w-[900px] mx-auto space-y-8" aria-busy="true" aria-label="Loading page">
      <div className="skeleton h-8 w-64 rounded-xl" />

      <div className="flex gap-3 flex-wrap">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton flex-1 min-w-[120px] h-[84px] rounded-2xl" />
        ))}
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[140px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
