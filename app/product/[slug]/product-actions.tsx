"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, ShoppingBag, Check } from "lucide-react"
import type { Product } from "@/lib/data"
import { useCart } from "@/lib/cart-context"

export function ProductActions({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, wishlist } = useCart()
  const [added, setAdded] = useState(false)
  const saved = wishlist.includes(product.id)
  const isLiveProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id)
  const isPreview = !isLiveProduct
  const unavailable = product.stock === "out_of_stock" || isPreview
  return <div className="mt-7 flex flex-col gap-3 sm:flex-row">
    <button type="button" disabled={unavailable} onClick={() => { addToCart(product); setAdded(true) }} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#c9a96e] px-5 font-semibold text-[#17130c] transition hover:bg-[#dfc797] disabled:cursor-not-allowed disabled:opacity-50">{isPreview ? <>Preview listing only</> : added ? <><Check size={18}/> Added to bag</> : <><ShoppingBag size={18}/> Add to bag</>}</button>
    <button type="button" onClick={() => toggleWishlist(product.id)} disabled={isPreview} aria-pressed={saved} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 transition hover:border-[#c9a96e] disabled:cursor-not-allowed disabled:opacity-50" aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}><Heart size={18} className={saved ? "fill-[#c9a96e] text-[#c9a96e]" : ""}/>{saved ? "Saved" : "Wishlist"}</button>
    {added && <Link href="/cart" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c9a96e]/50 px-5 font-medium text-[#dfc797] transition hover:bg-[#c9a96e]/10"><ShoppingBag size={18}/> View cart</Link>}

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c9a96e]/25 bg-[#0b0b0a]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/55">{product.name}</p>
          <p className="text-base font-bold text-[#f5f1e8]">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(product.price)}</p>
        </div>
        <button type="button" disabled={unavailable} onClick={() => { addToCart(product); setAdded(true) }} className="inline-flex min-h-12 min-w-[142px] items-center justify-center gap-2 rounded-xl bg-[#c9a96e] px-4 text-sm font-bold text-[#17130c] transition hover:bg-[#dfc797] disabled:cursor-not-allowed disabled:opacity-50">
          {isPreview ? "Preview only" : added ? <><Check size={17}/> Added</> : <><ShoppingBag size={17}/> Add to bag</>}
        </button>
      </div>
    </div>
  </div>
}
