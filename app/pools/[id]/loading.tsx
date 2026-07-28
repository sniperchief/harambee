export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="skeleton h-7 w-28 rounded-md" />
          <div className="skeleton h-8 w-20 rounded-md" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="skeleton h-8 w-64 rounded-md" />
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="skeleton h-64 rounded-[18px]" />
            <div className="skeleton h-48 rounded-[18px]" />
          </div>
          <div className="skeleton h-72 rounded-[18px] lg:col-span-1" />
        </div>
      </main>
    </div>
  );
}
