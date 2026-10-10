
"use client"

import Link from "next/link"
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react"
import { products } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { ProductCard } from "@/components/store/product-card"

export default function WishlistPage() {
  const { wishlist } = useCart()

  const savedProducts = products.filter((product) =>
    wishlist.includes(product.id),
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Continue shopping
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full border border-border bg-card">
            <Heart className="size-5 text-primary" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              My Wishlist
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your saved products, all in one place.
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">
            {savedProducts.length}{" "}
            {savedProducts.length === 1 ? "product" : "products"} saved
          </p>

          {savedProducts.length > 0 && (
            <Link
              href="/products"
              className="text-sm font-medium text-primary hover:underline"
            >
              Explore more
            </Link>
          )}
        </div>

        {savedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {savedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-5 py-12 text-center">
            <div className="mb-5 grid size-16 place-items-center rounded-full bg-secondary">
              <Heart
                className="size-7 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <h2 className="text-xl font-semibold">Your wishlist is empty</h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Found something you love? Tap the heart on any product to save it
              here for later.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              Explore Timora
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
