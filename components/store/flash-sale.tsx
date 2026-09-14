"use client"

import { useEffect, useState } from "react"
import { Zap } from "lucide-react"
import type { Product } from "@/lib/data"
import { ProductCard } from "./product-card"

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])
  const parts = [
    Math.floor(remaining / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ]
  return parts.map((p) => p.toString().padStart(2, "0"))
}

export function FlashSale({ products }: { products: Product[] }) {
  const [h, m, s] = useCountdown(2 * 3600 + 15 * 60 + 32)

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-sale/10 text-sale">
              <Zap className="size-5 fill-current" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Flash Sale
              </h2>
              <p className="text-sm text-muted-foreground">Limited-time festival prices</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span className="text-muted-foreground">Ends in</span>
            {[h, m, s].map((v, i) => (
              <span key={i} className="rounded bg-foreground px-2 py-1 font-mono text-sm font-bold tabular-nums text-background">
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
