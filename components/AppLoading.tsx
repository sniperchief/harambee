// Instant skeleton shown while an authed page's data loads. Keeping a nav-like
// bar means the header doesn't vanish during navigation — the click feels
// immediate instead of dead.
export function AppLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <div className="skeleton h-7 w-28 rounded-md" />
            <div className="hidden items-center gap-3 md:flex">
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-14 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          </div>
          <div className="skeleton h-8 w-28 rounded-full" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="skeleton h-9 w-44 rounded-md" />
        <div className="skeleton mt-6 h-24 w-full rounded-[18px]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-[18px]" />
          ))}
        </div>
      </main>
    </div>
  );
}
