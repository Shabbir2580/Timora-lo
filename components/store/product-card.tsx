"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, Truck, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { Rating } from "./rating"
import { Price } from "./price"
import { ProductBadgePill, VerifiedBadge } from "./badges"

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useCart()
  const wished = wishlist.includes(product.id)
  const outOfStock = product.stock === "out_of_stock"

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <Link href={`/product/${product.slug}`} className="relative block size-full">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain p-4 transition-transform duration-300 group-hover:scale-105",
              outOfStock && "opacity-60",
            )}
          />
        </Link>

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.badges.slice(0, 1).map((b) => (
            <ProductBadgePill key={b} badge={b} />
          ))}
          {outOfStock && (
            <span className="rounded bg-foreground/80 px-2 py-0.5 text-[10px] font-bold uppercase text-background">
              Out of Stock
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Heart className={cn("size-4", wished && "fill-sale text-sale")} aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {product.name}
          </h3>
          <Rating value={product.rating} count={product.reviewCount} />
          <Price price={product.price} mrp={product.mrp} className="mt-0.5" />
        </Link>

        {product.stock === "low_stock" && (
          <p className="text-xs font-medium text-warning-foreground">
            Only {product.stockCount} left
          </p>
        )}

        <div className="mt-1 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {!outOfStock ? (
            <p className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-success" aria-hidden />
              Get by {product.deliveryBy}
              {product.freeDelivery && <span className="text-success">· Free</span>}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="size-3.5" aria-hidden />
              Currently unavailable
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden />
              {product.returnDays}-day returns
            </span>
            {product.verified && <VerifiedBadge withLabel={false} />}
          </div>
        </div>
      </div>
    </div>
  )
}
