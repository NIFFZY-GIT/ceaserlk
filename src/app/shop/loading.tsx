const shimmerBlock = 'relative overflow-hidden rounded-2xl bg-white/10 animate-pulse';

export default function ShopLoading() {
  return (
    <div className="min-h-[80vh] w-full bg-gradient-to-b from-black via-slate-950 to-black py-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <div className="space-y-4">
          <div className="h-4 w-40 rounded-full bg-white/20" />
          <div className="h-10 w-3/4 rounded-2xl bg-white/10" />
          <div className="h-4 w-2/4 rounded-full bg-white/10" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="h-5 w-24 rounded-full bg-white/20" />
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, sectionIndex) => (
                <div key={sectionIndex} className="space-y-3">
                  <div className="h-4 w-28 rounded-full bg-white/20" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((__, optionIndex) => (
                      <div key={optionIndex} className="h-3 w-32 rounded-full bg-white/20" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-9 w-full rounded-full bg-white/20" />
          </aside>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="h-4 w-32 rounded-full bg-white/20" />
              <div className="flex gap-3">
                <div className="h-9 w-20 rounded-full bg-white/10" />
                <div className="h-9 w-28 rounded-full bg-white/10" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-5"
                >
                  <div className={`${shimmerBlock} aspect-[4/5]`} />
                  <div className="mt-6 space-y-4">
                    <div className="h-5 w-3/4 rounded-full bg-white/20" />
                    <div className="h-4 w-1/2 rounded-full bg-white/20" />
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-5 w-16 rounded-full bg-white/10" />
                      <div className="h-9 w-24 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
