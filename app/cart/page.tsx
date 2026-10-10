
"use client"

import Link from "next/link"
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, Truck, ShieldCheck } from "lucide-react"
import Image from "next/image"
import { useCart } from "@/lib/cart-context"

function formatPrice(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  })
}

export default function CartPage() {
  const { lines, count, subtotal, removeFromCart, setQuantity } = useCart()

  const shipping = 0
  const total = subtotal + shipping

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/products"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Continue shopping
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            YOUR TIMORA BAG
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Shopping Cart
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {count} {count === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        {lines.length === 0 ? (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <div className="mb-5 grid size-16 place-items-center rounded-full bg-secondary">
              <ShoppingBag
                className="size-7 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Your next favourite find is waiting. Explore our collection and
              add something you love.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              Explore products
            </Link>
          </section>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
            <section className="min-w-0 space-y-4" aria-label="Cart items">
              {lines.map((line) => {
                const product = line.product
                const lineTotal = product.price * line.quantity

                return (
                  <article
                    key={`${product.id}-${line.variant}`}
                    className="grid grid-cols-[96px_1fr] gap-4 rounded-xl border border-border bg-card p-3 sm:grid-cols-[128px_1fr] sm:gap-5 sm:p-5"
                  >
                    <Link
                      href={`/product/${product.slug}`}
                      aria-label={`View ${product.name}`}
                      className="relative aspect-square overflow-hidden rounded-lg bg-secondary"
                    >
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="128px"
                        className="object-contain p-2"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {product.brand}
                          </p>
                          <Link
                            href={`/product/${product.slug}`}
                            className="mt-1 line-clamp-2 text-sm font-semibold hover:text-primary sm:text-base"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Variant: {line.variant}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={`Remove ${product.name} from cart`}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
                        <div
                          className="inline-flex h-9 items-center rounded-lg border border-border"
                          aria-label="Quantity controls"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              line.quantity > 1
                                ? setQuantity(product.id, line.quantity - 1)
                                : removeFromCart(product.id)
                            }
                            aria-label={`Decrease quantity of ${product.name}`}
                            className="grid size-8 place-items-center hover:bg-accent"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>

                          <span
                            aria-live="polite"
                            className="min-w-8 text-center text-sm font-semibold"
                          >
                            {line.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(product.id, line.quantity + 1)
                            }
                            aria-label={`Increase quantity of ${product.name}`}
                            className="grid size-8 place-items-center hover:bg-accent"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(product.price)} each
                          </p>
                          <p className="mt-1 font-bold">
                            {formatPrice(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-4 text-sm text-muted-foreground">
                <ShieldCheck
                  className="size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                Review the final price, delivery charges, and return conditions
                before placing an order.
              </div>
            </section>

            <aside className="lg:sticky lg:top-6">
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                <h2 className="text-lg font-bold">Order Summary</h2>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Subtotal ({count} {count === 1 ? "item" : "items"})
                    </span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="size-4" aria-hidden="true" />
                      Shipping
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      Confirm at checkout
                    </span>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold">Subtotal before shipping</span>
                      <span className="text-xl font-bold">
                        {formatPrice(total)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Shipping, applicable taxes, and available discounts must
                      be confirmed before payment.
                    </p>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href="/products"
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-5 py-3 text-sm font-medium hover:bg-accent"
                >
                  Continue shopping
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
