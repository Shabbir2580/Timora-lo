"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Timora route error:", error)
  }, [error])

  return (
    <main className="flex min-h-[78vh] items-center justify-center px-5 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-[#c9a96e]/20 bg-gradient-to-b from-[#c9a96e]/[0.08] to-white/[0.015] p-7 text-center shadow-[0_20px_80px_rgba(0,0,0,0.25)] sm:p-10">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/[0.07] text-[#e5cb91]"><AlertTriangle className="size-6"/></span>
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-[#c9a96e]">A brief interruption</p>
        <h1 className="mt-3 text-2xl font-semibold">That didn’t go as planned.</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">Your shopping experience matters. Try loading this page again, or return to the collection while we recover.</p>
        {error.digest && <p className="mt-4 text-[11px] text-white/30">Reference: {error.digest}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] hover:bg-[#e5cb91]"><RefreshCw className="size-4"/>Try again</button>
          <Link href="/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm hover:border-[#c9a96e]/50 hover:text-[#e5cb91]">Browse products<ArrowRight className="size-4"/></Link>
        </div>
      </section>
    </main>
  )
}
