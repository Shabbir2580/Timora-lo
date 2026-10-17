"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, X } from "lucide-react"
import type { Product } from "@/lib/data"
import { formatINR } from "@/lib/format"
import type { CompareItem } from "@/components/store/product-compare-toggle"

const KEY = "timora-compare-v1"
const UPDATED_EVENT = "timora:compare-updated"
const MAX_COMPARE = 4

function readCompareItems(): CompareItem[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) || "[]")
    if (!Array.isArray(value)) return []
    return value.filter((entry): entry is CompareItem =>
      Boolean(entry) && typeof entry === "object" &&
      typeof (entry as CompareItem).id === "string" &&
      typeof (entry as CompareItem).slug === "string" &&
      typeof (entry as CompareItem).name === "string" &&
      typeof (entry as CompareItem).price === "number"
    ).slice(0, MAX_COMPARE)
  } catch {
    return []
  }
}

function toCompareItem(product: Product): CompareItem {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category || product.brand || "Other",
    price: product.price,
    mrp: product.mrp,
    image: product.image || product.images?.[0] || "/placeholder.svg",
    description: product.description || "",
    stockCount: typeof product.stockCount === "number"
      ? product.stockCount
      : product.stock === "out_of_stock" ? 0 : 1,
  }
}

export function ProductCompareTray({ products }: { products: Product[] }) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState("")
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const selected = useMemo(
    () => items.map((item) => productById.get(item.id)).filter((product): product is Product => Boolean(product)),
    [items, productById],
  )

  useEffect(() => {
    const sync = () => setItems(readCompareItems())
    sync()
    window.addEventListener(UPDATED_EVENT, sync)
    window.addEventListener("storage", sync)
    const handleToggle = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id
      const product = id ? productById.get(id) : undefined
      if (!product) return
      const current = readCompareItems()
      const exists = current.some((item) => item.id === id)
      if (exists) {
        const next = current.filter((item) => item.id !== id)
        window.localStorage.setItem(KEY, JSON.stringify(next))
        setItems(next)
        setNotice("")
        window.dispatchEvent(new Event(UPDATED_EVENT))
        return
      }
      if (current.length >= MAX_COMPARE) {
        setNotice("Compare up to four products. Remove one first.")
        return
      }
      const next = [...current, toCompareItem(product)]
      window.localStorage.setItem(KEY, JSON.stringify(next))
      setItems(next)
      setNotice("")
      window.dispatchEvent(new Event(UPDATED_EVENT))
    }
    window.addEventListener("timora:compare-toggle", handleToggle)
    return () => {
      window.removeEventListener(UPDATED_EVENT, sync)
      window.removeEventListener("storage", sync)
      window.removeEventListener("timora:compare-toggle", handleToggle)
    }
  }, [productById])

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    setItems(next)
    window.dispatchEvent(new Event(UPDATED_EVENT))
  }

  function clearItems() {
    window.localStorage.setItem(KEY, "[]")
    setItems([])
    setNotice("")
    setOpen(false)
    window.dispatchEvent(new Event(UPDATED_EVENT))
  }

  if (!selected.length) return null

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/45 bg-[#11110f]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:inset-x-6 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d4af37]/12 text-[#f5d76e]"><ArrowLeftRight className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f5f1e8]">Compare products <span className="text-[#d4af37]">({items.length}/{MAX_COMPARE})</span></p>
            <p className="truncate text-xs text-white/55">{selected.map((product) => product.name).join(" · ")}</p>
            {notice && <p role="status" className="text-xs text-amber-200">{notice}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={clearItems} className="min-h-10 rounded-lg px-3 text-xs text-white/60 hover:text-white">Clear</button>
          <Link href="/compare" className="inline-flex min-h-10 items-center rounded-lg bg-[#d4af37] px-4 text-xs font-bold text-[#17130c] transition hover:bg-[#f5d76e]">Compare list</Link>
          <button type="button" onClick={() => setOpen(true)} disabled={selected.length < 2} className="min-h-10 rounded-lg border border-[#d4af37]/40 px-3 text-xs font-semibold text-[#f5d76e] transition hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-45">Quick compare</button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="timora-compare-title" className="relative max-h-[88dvh] w-full max-w-5xl overflow-auto rounded-2xl border border-[#d4af37]/35 bg-[#11110f] p-4 shadow-2xl sm:p-6">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close comparison" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full border border-white/15 hover:border-[#d4af37]"><X className="size-4" /></button>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">Timora comparison</p>
            <h2 id="timora-compare-title" className="mt-1 pr-12 text-2xl font-semibold text-[#f5f1e8]">Choose with confidence</h2>
            <p className="mt-1 text-sm text-white/55">This selection is shared with product detail pages and your comparison list.</p>
            <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}>
              {selected.map((product) => (
                <article key={product.id} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#29251d] to-[#0b0b0a] p-3 sm:h-48">
                    <img src={product.image || "/placeholder.svg"} alt={product.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="space-y-3 p-3 sm:p-4">
                    <h3 className="line-clamp-3 min-h-12 text-sm font-semibold text-[#f5f1e8]">{product.name}</h3>
                    <p className="text-lg font-bold text-[#f5d76e]">{formatINR(product.price)}</p>
                    <dl className="space-y-2 text-xs">
                      <div className="border-t border-white/10 pt-2"><dt className="text-white/45">Category</dt><dd className="mt-0.5 text-white/85">{product.category}</dd></div>
                      <div className="border-t border-white/10 pt-2"><dt className="text-white/45">Availability</dt><dd className={product.stock === "out_of_stock" ? "mt-0.5 text-red-300" : "mt-0.5 text-emerald-300"}>{product.stock === "out_of_stock" ? "Out of stock" : product.stock === "low_stock" ? `Low stock${typeof product.stockCount === "number" ? ` · ${product.stockCount} left` : ""}` : "In stock"}</dd></div>
                      <div className="border-t border-white/10 pt-2"><dt className="text-white/45">Listed offer</dt><dd className="mt-0.5 text-white/85">{product.badges.includes("SALE") && product.mrp > product.price ? `${Math.round((1 - product.price / product.mrp) * 100)}% off` : "No offer listed"}</dd></div>
                    </dl>
                    <Link href={`/product/${product.slug}`} className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#d4af37]/40 px-2 text-center text-xs font-semibold text-[#f5d76e] hover:bg-[#d4af37]/10">View product</Link>
                    <button type="button" onClick={() => removeItem(product.id)} className="inline-flex min-h-9 w-full items-center justify-center gap-1 text-xs text-white/50 hover:text-red-200"><X className="size-3" /> Remove</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-5 flex justify-end"><button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-[#17130c]">Done</button></div>
          </section>
        </div>
      )}
    </>
  )
}
