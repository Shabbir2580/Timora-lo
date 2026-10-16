import { Sparkles } from "lucide-react"
import type { Product } from "@/lib/data"
import { ProductCard } from "./product-card"


export function FlashSale({ products }: { products: Product[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Featured collection
              </h2>
              <p className="text-sm text-muted-foreground">Discover selected products from the Timora collection</p>
            </div>
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
