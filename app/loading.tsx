export default function Loading() {
  return (
    <main aria-label="Loading Timora" aria-busy="true" className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <div className="mx-auto h-2 w-24 animate-pulse rounded-full bg-[#c9a96e]/35"/>
        <div className="mx-auto mt-5 h-8 w-56 animate-pulse rounded-lg bg-white/[0.08] sm:w-72"/>
        <div className="mx-auto mt-4 h-3 w-72 max-w-full animate-pulse rounded bg-white/[0.05]"/>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="aspect-[4/5] animate-pulse bg-gradient-to-br from-[#c9a96e]/[0.08] via-white/[0.025] to-white/[0.04]"/>
            <div className="space-y-3 p-4">
              <div className="h-2 w-1/3 animate-pulse rounded bg-[#c9a96e]/20"/>
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.08]"/>
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.05]"/>
              <div className="mt-4 h-9 animate-pulse rounded-full bg-white/[0.05]"/>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-xs tracking-wide text-white/35">Preparing something timeless…</p>
    </main>
  )
}
