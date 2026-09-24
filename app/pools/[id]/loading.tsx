export default function Loading() {
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
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton mt-6 h-[54px] w-96 max-w-full rounded-2xl" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="skeleton h-80 rounded-[20px]" />
              <div className="skeleton h-64 rounded-[20px]" />
            </div>
            <div className="skeleton h-[420px] rounded-[20px]" />
          </div>
        </div>
      </main>
    </div>
  );
}
