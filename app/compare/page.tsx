"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, GitCompareArrows, Trash2 } from "lucide-react"
import { SmartImage } from "@/components/store/smart-image"
import type { CompareItem } from "@/components/store/product-compare-toggle"

const KEY = "timora-compare-v1"
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)

function writeCompareItems(items: CompareItem[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items))
    window.dispatchEvent(new Event("timora:compare-updated"))
    return true
  } catch {
    return false
  }
}

export default function ComparePage() {
  const [items, setItems] = useState<CompareItem[]>([])
  useEffect(() => {
    const sync = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown
        if (Array.isArray(parsed)) setItems(parsed.filter((item): item is CompareItem => Boolean(item) && typeof item === "object" && typeof (item as CompareItem).id === "string" && typeof (item as CompareItem).slug === "string" && typeof (item as CompareItem).name === "string" && typeof (item as CompareItem).price === "number").slice(0, 4))
      } catch { setItems([]) }
    }
    sync()
    window.addEventListener("timora:compare-updated", sync)
    window.addEventListener("storage", sync)
    return () => { window.removeEventListener("timora:compare-updated", sync); window.removeEventListener("storage", sync) }
  }, [])

  function remove(id: string) {
    const next = items.filter((item) => item.id !== id)
    if (!writeCompareItems(next)) return
    setItems(next)
  }

  return <main className="min-h-screen bg-[#0b0b0a] text-[#f5f1e8]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/products" className="inline-flex min-h-10 items-center gap-2 text-sm text-white/60 hover:text-[#dfc797]"><ArrowLeft className="size-4"/> Continue shopping</Link>
      <header className="mt-7 border-b border-white/10 pb-6"><p className="text-[10px] uppercase tracking-[0.25em] text-[#c9a96e]">Make a confident choice</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold sm:text-4xl">Compare products <GitCompareArrows className="size-7 text-[#d4af37]"/></h1><p className="mt-2 text-sm text-white/50">Compare up to four products saved in this browser.</p></header>
      {!items.length ? <section className="mt-8 rounded-2xl border border-dashed border-white/15 px-5 py-14 text-center"><GitCompareArrows className="mx-auto size-9 text-[#c9a96e]/70"/><h2 className="mt-4 text-xl font-semibold">Your comparison is empty</h2><p className="mt-2 text-sm text-white/50">Open a product and choose Compare product to add it here.</p><Link href="/products" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c]">Browse products</Link></section> : <>
        <div className="mt-6 flex justify-end"><button type="button" onClick={() => { if (writeCompareItems([])) setItems([]) }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs text-white/60 hover:border-red-300/30 hover:text-red-200"><Trash2 className="size-4"/> Clear comparison</button></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[560px] border-collapse text-left text-sm"><thead><tr><th className="w-36 border-b border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">Feature</th>{items.map(item=><th key={item.id} className="min-w-48 border-b border-l border-white/10 p-3 align-top"><div className="relative aspect-square max-w-48 overflow-hidden rounded-lg bg-white/[0.03]"><SmartImage src={item.image} alt={item.name} fill sizes="192px" className="object-contain p-3"/></div><Link href={"/product/"+encodeURIComponent(item.slug)} className="mt-3 block font-medium hover:text-[#dfc797]">{item.name}</Link><button type="button" onClick={()=>remove(item.id)} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-red-200/80 hover:text-red-200"><Trash2 className="size-3.5"/> Remove</button></th>)}</tr></thead><tbody>
          <tr><th className="border-b border-white/10 p-3 text-xs text-white/45">Price</th>{items.map(item=><td key={item.id} className="border-b border-l border-white/10 p-3 font-semibold text-[#dfc797]">{money(item.price)}</td>)}</tr>
          <tr><th className="border-b border-white/10 p-3 text-xs text-white/45">MRP</th>{items.map(item=><td key={item.id} className="border-b border-l border-white/10 p-3 text-white/70">{money(item.mrp)}</td>)}</tr>
          <tr><th className="border-b border-white/10 p-3 text-xs text-white/45">Category</th>{items.map(item=><td key={item.id} className="border-b border-l border-white/10 p-3 text-white/70">{item.category}</td>)}</tr>
          <tr><th className="border-b border-white/10 p-3 text-xs text-white/45">Availability</th>{items.map(item=><td key={item.id} className="border-b border-l border-white/10 p-3 text-white/70">{item.stockCount > 0 ? "In stock ("+item.stockCount+")" : "Out of stock at last view"}</td>)}</tr>
          <tr><th className="p-3 text-xs text-white/45">Description</th>{items.map(item=><td key={item.id} className="border-l border-white/10 p-3 align-top leading-6 text-white/60">{item.description || "No description available."}</td>)}</tr>
        </tbody></table></div>
        <p className="mt-3 text-xs leading-5 text-white/35">Prices and stock are snapshots from when you added each item. Open the product page to check current availability and pricing before ordering.</p>
      </>}
    </div>
  </main>
}
