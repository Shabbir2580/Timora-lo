import Link from "next/link"
import { ArrowLeft, ArrowRight, Search } from "lucide-react"

export default function NotFound() {
  return (
    <main className="relative flex min-h-[78vh] items-center justify-center overflow-hidden px-5 py-20">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c9a96e]/10 sm:size-[36rem]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c9a96e]/15 sm:size-[27rem]" />
      <section className="relative z-10 mx-auto max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#c9a96e]">Timora · Lost in luxury</p>
        <p className="mt-8 bg-gradient-to-b from-[#f7e7bd] to-[#9e7b3d] bg-clip-text text-8xl font-semibold tracking-tight text-transparent sm:text-9xl">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">This page slipped away.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/55">The link may be old, or the page may have moved. Let’s get you back to something worth discovering.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 text-sm font-semibold text-[#17130c] hover:bg-[#e5cb91]"><ArrowLeft className="size-4"/>Back to home</Link>
          <Link href="/products" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#c9a96e]/35 px-6 text-sm text-[#ead8b0] hover:bg-[#c9a96e]/10"><Search className="size-4"/>Explore collection<ArrowRight className="size-4"/></Link>
        </div>
      </section>
    </main>
  )
}
