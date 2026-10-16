"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { GitCompareArrows } from "lucide-react"

export type CompareItem = { id: string; slug: string; name: string; category: string; price: number; mrp: number; image: string; description: string; stockCount: number }
const KEY = "timora-compare-v1"

export function ProductCompareToggle({ item }: { item: CompareItem }) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [notice, setNotice] = useState("")

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown
      if (Array.isArray(parsed)) setItems(parsed.filter((entry): entry is CompareItem =>
        Boolean(entry) && typeof entry === "object" &&
        typeof (entry as CompareItem).id === "string" &&
        typeof (entry as CompareItem).slug === "string" &&
        typeof (entry as CompareItem).name === "string" &&
        typeof (entry as CompareItem).price === "number"
      ).slice(0, 4))
    } catch { setItems([]) }
  }, [])

  function toggle() {
    const exists = items.some((entry) => entry.id === item.id)
    if (exists) {
      const next = items.filter((entry) => entry.id !== item.id)
      setItems(next)
      window.localStorage.setItem(KEY, JSON.stringify(next))
      setNotice("Removed from comparison.")
      return
    }
    if (items.length >= 4) {
      setNotice("Compare up to four products at a time. Remove one first.")
      return
    }
    const next = [...items, item]
    setItems(next)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    setNotice("Added to comparison.")
  }

  const selected = items.some((entry) => entry.id === item.id)
  return <div className="mt-3 flex flex-wrap items-center gap-3">
    <button type="button" onClick={toggle} aria-pressed={selected} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#c9a96e]/40 px-4 text-sm text-[#dfc797] transition hover:bg-[#c9a96e]/10">
      <GitCompareArrows className="size-4" />{selected ? "Remove comparison" : "Compare product"}
    </button>
    <Link href="/compare" className="inline-flex min-h-10 items-center text-sm text-white/55 underline underline-offset-4 hover:text-[#dfc797]">Compare list ({items.length})</Link>
    {notice && <p role="status" className="w-full text-xs text-white/50">{notice}</p>}
  </div>
}
