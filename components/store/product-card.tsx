
"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, Truck, RotateCcw, ArrowUpRight, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { Rating } from "./rating"
import { Price } from "./price"
import { ProductBadgePill } from "./badges"

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useCart()
  const wished = wishlist.includes(product.id)
  const outOfStock = product.stock === "out_of_stock"

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#302c24] bg-[#151512] transition duration-300 hover:-translate-y-1 hover:border-[#c9a96e]/50 hover:shadow-xl hover:shadow-black/20">
      <div className="relative aspect-square overflow-hidden bg-[#1c1b17]">
        <Link
          href={`/product/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="relative block size-full"
        >
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain p-4 transition-transform duration-500 group-hover:scale-105 sm:p-5",
              outOfStock && "opacity-45 grayscale",
            )}
          />
        </Link>

        <div className="absolute left-2 top-2 flex max-w-[70%] flex-col items-start gap-1.5 sm:left-3 sm:top-3">
          {product.badges.slice(0, 1).map((badge) => (
            <ProductBadgePill key={badge} badge={badge} />
          ))}

          {outOfStock && (
            <span className="rounded-full border border-white/10 bg-[#0b0b0a]/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/70">
              Out of stock
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          className={cn(
            "absolute right-2 top-2 grid size-9 place-items-center rounded-full border backdrop-blur-md transition sm:right-3 sm:top-3",
            wished
              ? "border-[#c9a96e]/60 bg-[#c9a96e] text-[#17130c]"
              : "border-white/15 bg-[#0b0b0a]/75 text-white/75 hover:border-[#c9a96e]/60 hover:text-[#dfc797]",
          )}
        >
          <Heart
            className={cn("size-4 transition", wished && "fill-current")}
            aria-hidden="true"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#151512]/60 to-transparent" />

        {!outOfStock && (
          <Link
            href={`/product/${product.slug}`}
            className="absolute bottom-3 left-3 right-3 hidden min-h-10 translate-y-2 items-center justify-center gap-2 rounded-full bg-[#c9a96e] px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#17130c] opacity-0 transition duration-300 hover:bg-[#dfc797] focus-visible:translate-y-0 focus-visible:opacity-100 sm:flex lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
          >
            View details <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col gap-1.5">
          <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#c9a96e]/80 sm:text-[10px]">
            {product.brand}
          </span>

          <h3 className="line-clamp-2 min-h-10 text-xs font-medium leading-5 text-[#f5f1e8] transition-colors group-hover:text-[#dfc797] sm:text-sm">
            {product.name}
          </h3>

          <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
            <Rating value={product.rating} count={product.reviewCount} />
          </div>

          <div className="mt-0.5">
            <Price price={product.price} mrp={product.mrp} />
          </div>
        </Link>

        {product.stock === "low_stock" && (
          <p className="text-[10px] font-medium text-[#e0b66b] sm:text-xs">
            Limited availability
          </p>
        )}

        <div className="mt-1 space-y-2 border-t border-[#302c24] pt-3 text-[10px] leading-relaxed text-[#b0aaa0] sm:text-xs">
          {!outOfStock ? (
            <p className="flex items-start gap-2">
              <Truck className="mt-0.5 size-3.5 shrink-0 text-[#c9a96e]" aria-hidden="true" />
              <span>
                {product.deliveryBy && product.deliveryBy !== "—"
                  ? `Estimated delivery: ${product.deliveryBy}`
                  : "Delivery estimate at checkout"}
                {product.freeDelivery && (
                  <span className="ml-1 text-[#d8bc88]">· Free delivery</span>
                )}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-2 text-white/40">
              <Truck className="size-3.5 shrink-0" aria-hidden="true" />
              Currently unavailable
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <RotateCcw className="size-3.5 shrink-0 text-[#c9a96e]" aria-hidden="true" />
              <span>
                {product.returnDays > 0
                  ? `${product.returnDays}-day returns`
                  : "Check return policy"}
              </span>
            </span>

            {product.verified && (
              <span
                title="Product information marked as verified in the catalogue"
                className="inline-flex shrink-0 items-center gap-1 text-[9px] text-[#d8bc88]"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Verified</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
