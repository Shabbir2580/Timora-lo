"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock3 } from "lucide-react"
import { SmartImage } from "@/components/store/smart-image"

type RecentProduct = { slug: string; name: string; image: string; price: number; category: string }
const STORAGE_KEY = "timora-recent-products-v1"
const money = (price: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price)

export function RecentlyViewedProducts({ product }: { product: RecentProduct }) {
  const [recent, setRecent] = useState<RecentProduct[]>([])

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown
      const valid = Array.isArray(saved) ? saved.filter((item): item is RecentProduct =>
        Boolean(item) && typeof item === "object" &&
        typeof (item as RecentProduct).slug === "string" &&
        typeof (item as RecentProduct).name === "string" &&
        typeof (item as RecentProduct).image === "string" &&
        typeof (item as RecentProduct).price === "number" &&
        typeof (item as RecentProduct).category === "string"
      ) : []
      const next = [product, ...valid.filter((item) => item.slug !== product.slug)].slice(0, 8)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setRecent(next.filter((item) => item.slug !== product.slug).slice(0, 4))
    } catch {
      setRecent([])
    }
  }, [product])

  if (!recent.length) return null

  return (
    <section className="mt-12 border-t border-white/10 pt-8 sm:mt-16 sm:pt-10" aria-labelledby="recently-viewed-heading">
      <div className="flex items-center gap-2 text-[#c9a96e]"><Clock3 className="size-4" /><p className="text-[10px] uppercase tracking-[0.25em]">Your browsing history</p></div>
      <h2 id="recently-viewed-heading" className="mt-2 text-2xl font-semibold">Recently viewed</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recent.map((item) => <Link key={item.slug} href={`/product/${encodeURIComponent(item.slug)}`} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-[#c9a96e]/50">
          <div className="relative aspect-square bg-white/[0.03]"><SmartImage src={item.image} alt={item.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-4 transition-transform group-hover:scale-105" /></div>
          <div className="p-3"><p className="text-[10px] uppercase tracking-wide text-[#c9a96e]">{item.category}</p><p className="mt-1 line-clamp-2 min-h-10 text-sm text-white/80">{item.name}</p><p className="mt-2 text-sm font-semibold text-[#dfc797]">{money(item.price)}</p></div>
        </Link>)}
      </div>
    </section>
  )
}
