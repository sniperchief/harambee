// Instant skeleton shown while an authed page's data loads. It mirrors the app
// nav (logo + links on the left, account chip on the right) and the dashboard
// layout, so a click feels immediate instead of dead.
export function AppLoading() {
  return (
    <div className="min-h-screen">
      <header className="nav-bar nav-bar--left">
        <div className="nav-bar__inner">
          <div className="skeleton h-8 w-36 rounded-full" />
          <div className="hidden items-center gap-2 min-[900px]:flex">
            <div className="skeleton h-10 w-28 rounded-full" />
            <div className="skeleton h-10 w-20 rounded-full" />
          </div>
          <div className="flex justify-end">
            <div className="skeleton h-11 w-40 rounded-full" />
          </div>
        </div>
      </header>

      <main className="section !pt-14">
        <div className="section__inner">
          <div className="skeleton h-4 w-44 rounded-full" />
          <div className="skeleton mt-4 h-[72px] w-80 max-w-full rounded-2xl" />
          <div className="skeleton mt-8 h-[218px] rounded-[20px]" />
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-36 rounded-[20px]" />
                ))}
              </div>
              <div className="skeleton h-72 rounded-[20px]" />
            </div>
            <div className="skeleton h-96 rounded-[20px]" />
          </div>
        </div>
      </main>
    </div>
  );
}
