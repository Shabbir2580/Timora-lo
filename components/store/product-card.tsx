"use client"

import { useState } from "react"
import Link from "next/link"
import { SmartImage } from "@/components/store/smart-image"
import { Check, Heart, ShoppingCart, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { Rating } from "./rating"
import { Price } from "./price"
import { ProductBadgePill } from "./badges"

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist, addToCart } = useCart()
  const [added, setAdded] = useState(false)
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
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary via-secondary to-background">
        <Link href={`/product/${product.slug}`} className="relative block size-full" aria-label={`View ${product.name}`}>
          <SmartImage
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06] sm:p-5",
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
            <span key={tag} className="max-w-28 truncate rounded border border-[#d4af37]/35 bg-[#0b0b0a]/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#f5d76e] shadow-sm" title={tag}>
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
  )
}
