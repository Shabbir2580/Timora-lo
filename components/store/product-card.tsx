"use client"

import { useState } from "react"
import Link from "next/link"
import { SmartImage } from "@/components/store/smart-image"
import { ArrowLeftRight, ArrowRight, Check, Eye, Heart, ShoppingCart, Truck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { Rating } from "./rating"
import { Price } from "./price"
import { ProductBadgePill } from "./badges"

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist, addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const wished = wishlist.includes(product.id)
  const isLiveProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id)
  const isPreview = !isLiveProduct
  const outOfStock = product.stock === "out_of_stock"
  const explicitlyOnSale = (product.tags ?? []).some((tag) => tag.trim().toLowerCase() === "sale")
  const discountPercent = explicitlyOnSale && product.mrp > product.price && product.mrp > 0
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0

  function handleAddToCart() {
    if (outOfStock || isPreview) return
    addToCart(product)
    setAdded(true)
  }

  return (
    <>
    <article
      className="timora-product-card group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d4af37]/45 hover:shadow-lg hover:shadow-[#d4af37]/[0.08] focus-within:border-[#f5d76e]/70"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return
        const rect = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`)
        event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`)
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty("--spotlight-x")
        event.currentTarget.style.removeProperty("--spotlight-y")
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary via-secondary to-background sm:aspect-[4/4.4]">
        <Link href={`/product/${product.slug}`} className="relative block size-full" aria-label={`View ${product.name}`}>
          <SmartImage
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain p-2.5 transition-transform duration-500 group-hover:scale-[1.04] sm:p-5",
              outOfStock && "opacity-60",
            )}
          />
        </Link>

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.badges.slice(0, 1).map((badge) => (
            <ProductBadgePill key={badge} badge={badge} />
          ))}
          {discountPercent > 0 && (
            <span className="w-fit rounded bg-[#d4af37] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#17130c] shadow-sm">
              {discountPercent}% off
            </span>
          )}
          {(product.tags ?? []).filter((tag) => tag.trim().toLowerCase() !== "sale").slice(0, 2).map((tag) => (
            <span key={tag} className="max-w-24 truncate rounded border border-[#d4af37]/35 bg-[#0b0b0a]/95 px-1.5 py-1 text-[8px] font-semibold uppercase tracking-wide text-[#f5d76e] shadow-sm sm:max-w-28 sm:px-2 sm:text-[9px]" title={tag}>
              {tag}
            </span>
          ))}
          {isPreview && (
            <span className="rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
              Preview only
            </span>
          )}
          {outOfStock && !isPreview && (
            <span className="rounded bg-foreground/80 px-2 py-0.5 text-[10px] font-bold uppercase text-background">
              Out of Stock
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          disabled={isPreview}
          aria-label={isPreview ? `${product.name} is a preview item` : wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur transition-all hover:border-[#d4af37]/50 hover:text-[#d4af37] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Heart className={cn("size-4", wished && "fill-sale text-sale")} aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("timora:compare-toggle", { detail: { id: product.id } }))}
          aria-label={`Add ${product.name} to product comparison`}
          className="absolute bottom-14 right-2 grid size-9 place-items-center rounded-full border border-[#d4af37]/40 bg-[#0b0b0a]/90 text-[#f5d76e] shadow-sm backdrop-blur transition hover:bg-[#d4af37] hover:text-[#17130c]"
          title="Compare product"
        >
          <ArrowLeftRight className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          aria-label={`Quick view: ${product.name}`}
          className="absolute bottom-2 left-2 right-2 inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-[#d4af37]/50 bg-[#0b0b0a]/90 px-2 text-[10px] font-semibold text-[#f5d76e] shadow-lg backdrop-blur transition hover:bg-[#d4af37] hover:text-[#17130c] sm:min-h-10 sm:gap-2 sm:px-3 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <Eye className="size-3.5" aria-hidden /> Quick view
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
            {product.category || product.brand}
          </span>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {product.name}
          </h3>
          <Rating value={product.rating} count={product.reviewCount} />
          <Price price={product.price} mrp={product.mrp} sale={explicitlyOnSale} className="mt-0.5" />
        </Link>

        {product.stock === "low_stock" && (
          <p className="text-xs font-medium text-warning-foreground">
            Only {product.stockCount} left
          </p>
        )}

        <div className="mt-1 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {isPreview ? (
            <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              Preview listing — not available to order
            </p>
          ) : !outOfStock ? (
            <p className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-success" aria-hidden />
              Delivery details at checkout
              {product.freeDelivery && <span className="text-success">· Listed free</span>}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="size-3.5" aria-hidden />
              Currently unavailable
            </p>
          )}
          <p className="truncate">
            {product.stock === "low_stock" ? "Limited listed stock" : outOfStock ? "Unavailable" : "Availability listed"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock || isPreview}
          aria-live="polite"
          className={cn(
            "timora-gold-cta mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
            added
              ? "border border-success/40 bg-success/10 text-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90",
          )}
        >
          {isPreview ? (
            "Preview only"
          ) : outOfStock ? (
            "Currently unavailable"
          ) : added ? (
            <><Check className="size-4" aria-hidden /> Added to bag</>
          ) : (
            <><ShoppingCart className="size-4" aria-hidden /> Add to bag</>
          )}
        </button>
        {added && (
          <Link href="/cart" className="text-center text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80">
            View shopping bag
          </Link>
        )}
      </div>
    </article>

    {quickViewOpen && (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setQuickViewOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuickViewOpen(false)
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={`quick-view-title-${product.id}`}
          className="relative grid max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#d4af37]/35 bg-[#11110f] shadow-2xl shadow-black/50 sm:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => setQuickViewOpen(false)}
            aria-label="Close quick view"
            className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-[#d4af37] hover:text-[#f5d76e]"
          >
            <X className="size-4" aria-hidden />
          </button>
          <div className="relative min-h-64 bg-gradient-to-br from-[#26231b] to-[#0b0b0a] sm:min-h-[360px]">
            <SmartImage
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 420px"
              className="object-contain p-8"
            />
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">{product.category || product.brand}</p>
            <h2 id={`quick-view-title-${product.id}`} className="mt-2 pr-8 text-xl font-semibold leading-snug text-[#f5f1e8] sm:text-2xl">{product.name}</h2>
            <div className="mt-3"><Rating value={product.rating} count={product.reviewCount} /></div>
            <div className="mt-3"><Price price={product.price} mrp={product.mrp} sale={explicitlyOnSale} /></div>
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-white/65">{product.description || "Explore the details of this curated Timora product."}</p>
            <p className="mt-4 text-xs text-white/55">{isPreview ? "Preview listing · ordering is disabled" : outOfStock ? "Currently unavailable" : product.stock === "low_stock" ? `Limited availability · ${product.stockCount} listed remaining` : "Availability confirmed on the product page"}</p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  handleAddToCart()
                  if (!outOfStock && !isPreview) setQuickViewOpen(false)
                }}
                disabled={outOfStock || isPreview}
                className="timora-gold-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-3 text-sm font-semibold text-[#17130c] transition hover:bg-[#f5d76e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="size-4" aria-hidden /> Add to bag
              </button>
              <Link href={`/product/${product.slug}`} onClick={() => setQuickViewOpen(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d4af37]/35 px-4 py-3 text-sm font-semibold text-[#f5d76e] transition hover:bg-[#d4af37]/10">
                Full product details <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    )}
    </>
  )
}
