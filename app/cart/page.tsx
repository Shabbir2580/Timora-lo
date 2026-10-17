
"use client"

import Link from "next/link"
import { SmartImage } from "@/components/store/smart-image"
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatINR } from "@/lib/format"

export default function CartPage() {
  const {
    lines,
    subtotal,
    count,
    removeFromCart,
    setQuantity,
    clearCart,
  } = useCart()

  // Keep the cart estimate aligned with the server checkout rule: free shipping at ₹999,
  // otherwise ₹80. Checkout remains authoritative for the final amount.
  const freeShippingThreshold = 999
  const estimatedShipping = subtotal >= freeShippingThreshold ? 0 : 80
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  const shippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100)

  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-7">
        <p className="text-sm font-semibold tracking-widest text-primary">
          YOUR BAG
        </p>

        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Shopping bag
        </h1>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {count} item{count === 1 ? "" : "s"} in your bag
          </p>
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove every item from your shopping bag?")) clearCart()
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 text-xs text-muted-foreground transition hover:border-red-300/30 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Clear bag
            </button>
          )}
        </div>
      </div>

      {!lines.length ? (
        <section className="rounded-2xl border border-dashed border-border px-5 py-14 text-center sm:px-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
            <ShoppingBag
              className="size-7 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          <h2 className="mt-5 text-xl font-bold">
            Your bag is waiting
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Explore Timora and find something you’ll love. Items you add
            will appear here.
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Explore products
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section
            aria-label="Items in your shopping bag"
            className="space-y-3"
          >
            {lines.map(({ product, variant, quantity }) => {
              const max =
                product.stock === "out_of_stock"
                  ? 0
                  : product.stock === "low_stock" &&
                      typeof product.stockCount === "number"
                    ? Math.max(0, Math.floor(product.stockCount))
                    : 99

              const lineKey = `${product.id}-${variant}`

              return (
                <article
                  key={lineKey}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-5 sm:p-5"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-32"
                    aria-label={`View ${product.name}`}
                  >
                    <SmartImage
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 96px, 128px"
                      className="object-contain p-2"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {product.brand}
                    </p>

                    <Link
                      href={`/product/${product.slug}`}
                      className="mt-1 line-clamp-2 font-semibold leading-snug hover:underline"
                    >
                      {product.name}
                    </Link>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Option: {variant}
                    </p>

                    <p className="mt-2 text-base font-bold">
                      {formatINR(product.price)}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <div
                        className="inline-flex items-center rounded-lg border border-border"
                        aria-label={`Quantity for ${product.name}`}
                      >
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${product.name}`}
                          disabled={quantity <= 1}
                          onClick={() =>
                            setQuantity(
                              product.id,
                              quantity - 1,
                              variant,
                            )
                          }
                          className="grid size-9 place-items-center rounded-l-lg hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="size-4" aria-hidden="true" />
                        </button>

                        <span
                          className="min-w-8 text-center text-sm font-semibold"
                          aria-live="polite"
                        >
                          {quantity}
                        </span>

                        <button
                          type="button"
                          aria-label={`Increase quantity of ${product.name}`}
                          disabled={quantity >= max}
                          onClick={() =>
                            setQuantity(
                              product.id,
                              quantity + 1,
                              variant,
                            )
                          }
                          className="grid size-9 place-items-center rounded-r-lg hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(product.id, variant)
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-destructive hover:bg-accent"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Remove
                      </button>
                    </div>

                    <p className="mt-2 text-right text-sm text-muted-foreground">
                      Line total:{" "}
                      <span className="font-semibold text-foreground">
                        {formatINR(product.price * quantity)}
                      </span>
                    </p>

                    {product.stock === "low_stock" &&
                      typeof product.stockCount === "number" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Listed stock: {product.stockCount}
                        </p>
                      )}

                    {product.stock === "out_of_stock" && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        This product is currently out of stock.
                      </p>
                    )}
                  </div>
                </article>
              )
            })}

            <Link
              href="/products"
              className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowRight
                className="size-4 rotate-180"
                aria-hidden="true"
              />
              Continue shopping
            </Link>
          </section>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold">Order summary</h2>

            <section aria-label="Free shipping progress" className="mt-4 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.045] p-3.5">
              {subtotal >= freeShippingThreshold ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-[#dfc797]">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                  You’ve unlocked free shipping!
                </p>
              ) : (
                <p className="text-sm leading-5 text-muted-foreground">
                  Add <span className="font-semibold text-foreground">{formatINR(amountToFreeShipping)}</span> more to unlock free shipping.
                </p>
              )}
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label="Free shipping threshold progress"
                aria-valuemin={0}
                aria-valuemax={freeShippingThreshold}
                aria-valuenow={Math.min(subtotal, freeShippingThreshold)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a78328] via-[#d4af37] to-[#f5d76e] transition-[width] duration-500 ease-out"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                <span>{formatINR(Math.min(subtotal, freeShippingThreshold))} reached</span>
                <span>{formatINR(freeShippingThreshold)} threshold</span>
              </div>
            </section>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Items ({count})
                </span>
                <span>{formatINR(subtotal)}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Estimated shipping</span>
                <span className={estimatedShipping === 0 ? "font-semibold text-emerald-500" : "text-foreground"}>
                  {estimatedShipping === 0 ? "FREE" : formatINR(estimatedShipping)}
                </span>
              </div>

              <div className="space-y-2 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.05] p-3">
                <div className="flex items-start justify-between gap-3 text-xs leading-5">
                  <span className="text-muted-foreground">
                    {estimatedShipping === 0
                      ? "You unlocked free shipping!"
                      : `Add ${formatINR(amountToFreeShipping)} for free shipping`}
                  </span>
                  <span className="shrink-0 font-semibold text-[#d4af37]">₹999+</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Progress toward free shipping"
                  aria-valuemin={0}
                  aria-valuemax={999}
                  aria-valuenow={Math.min(subtotal, 999)}
                  className="h-1.5 overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f5d76e] transition-[width] duration-300"
                    style={{ width: `${shippingProgress}%` }}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between gap-4 text-base font-bold">
                  <span>Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Estimated total before any coupon: {formatINR(subtotal + estimatedShipping)}. Final shipping and discounts are confirmed at checkout.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2 rounded-xl bg-secondary/70 p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              Final price, delivery, stock and payment must be confirmed
              before an order is placed.
            </div>

            <Link
              href="/checkout"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Proceed to checkout
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Choose UPI QR payment or WhatsApp ordering at checkout.
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}
