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
    {added && <Link href="/cart" className="sr-only">View cart</Link>}
  </div>
}
