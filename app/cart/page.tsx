"use client"

import Link from "next/link"
import Image from "next/image"
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ShieldCheck } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatINR } from "@/lib/format"

export default function CartPage() {
  const { lines, subtotal, count, removeFromCart, setQuantity } = useCart()

  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-7">
        <p className="text-sm font-semibold tracking-widest text-primary">YOUR BAG</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Shopping bag</h1>
        <p className="mt-2 text-sm text-muted-foreground">{count} item{count === 1 ? "" : "s"} in your bag</p>
      </div>

      {!lines.length ? (
        <section className="rounded-2xl border border-dashed border-border px-5 py-14 text-center sm:px-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
            <ShoppingBag className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-5 text-xl font-bold">Your bag is waiting</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Explore Timora and find something you’ll love. Items you add will appear here.</p>
          <Link href="/products" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Explore products <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-label="Items in your shopping bag" className="space-y-3">
            {lines.map(({ product, variant, quantity }) => {
              const max = product.stock === "low_stock" && typeof product.stockCount === "number"
                ? Math.max(1, product.stockCount)
                : 99
              const lineKey = `${product.id}-${variant}`
              return (
                <article key={lineKey} className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-5 sm:p-5">
                  <Link href={`/product/${product.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-32" aria-label={`View ${product.name}`}>
                    <Image src={product.image || "/placeholder.svg"} alt={product.name} fill sizes="128px" className="object-contain p-2" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{product.brand}</p>
                    <Link href={`/product/${product.slug}`} className="mt-1 line-clamp-2 font-semibold leading-snug hover:underline">{product.name}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">Option: {variant}</p>
                    <p className="mt-2 text-base font-bold">{formatINR(product.price)}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <div className="inline-flex items-center rounded-lg border border-border" aria-label={`Quantity for ${product.name}`}>
                        <button type="button" aria-label={`Decrease quantity of ${product.name}`} disabled={quantity <= 1} onClick={() => setQuantity(product.id, quantity - 1, variant)} className="grid size-9 place-items-center rounded-l-lg hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
                        <button type="button" aria-label={`Increase quantity of ${product.name}`} disabled={quantity >= max} onClick={() => setQuantity(product.id, quantity + 1, variant)} className="grid size-9 place-items-center rounded-r-lg hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(product.id, variant)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-destructive hover:bg-accent">
                        <Trash2 className="size-4" aria-hidden /> Remove
                      </button>
                    </div>
                    <p className="mt-2 text-right text-sm text-muted-foreground">Line total: <span className="font-semibold text-foreground">{formatINR(product.price * quantity)}</span></p>
                    {product.stock === "low_stock" && typeof product.stockCount === "number" && (
                      <p className="mt-1 text-xs text-muted-foreground">Listed stock: {product.stockCount}</p>
                    )}
                  </div>
                </article>
              )
            })}
            <Link href="/products" className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold text-primary hover:underline">
              <ArrowRight className="size-4 rotate-180" aria-hidden /> Continue shopping
            </Link>
          </section>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold">Order summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Items ({count})</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Shipping</span><span className="text-muted-foreground">Calculated later</span></div>
              <div className="border-t border-border pt-4"><div className="flex justify-between gap-4 text-base font-bold"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div></div>
            </div>
            <div className="mt-5 flex gap-2 rounded-xl bg-secondary/70 p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              Final price, delivery, stock and payment will need confirmation before an order is placed.
            </div>
            <button type="button" disabled className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-50" title="Secure checkout is not connected yet">
              Checkout <ArrowRight className="size-4" aria-hidden />
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Checkout is not connected yet.</p>
          </aside>
        </div>
      )}
    </main>
  )
}
