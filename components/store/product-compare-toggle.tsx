"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { GitCompareArrows } from "lucide-react"

export type CompareItem = { id: string; slug: string; name: string; category: string; price: number; mrp: number; image: string; description: string; stockCount: number }
const KEY = "timora-compare-v1"
const UPDATED_EVENT = "timora:compare-updated"
const MAX_COMPARE = 4

function readCompareItems(): CompareItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is CompareItem =>
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

export function ProductCompareToggle({ item }: { item: CompareItem }) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [notice, setNotice] = useState("")

  const sync = useCallback(() => setItems(readCompareItems()), [])

  useEffect(() => {
    sync()
    window.addEventListener(UPDATED_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(UPDATED_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [sync])

  function toggle() {
    const current = readCompareItems()
    const exists = current.some((entry) => entry.id === item.id)
    if (exists) {
      const next = current.filter((entry) => entry.id !== item.id)
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        setNotice("Comparison could not be saved in this browser.")
        return
      }
      setItems(next)
      setNotice("Removed from comparison.")
      window.dispatchEvent(new Event(UPDATED_EVENT))
      return
    }
    if (current.length >= MAX_COMPARE) {
      setItems(current)
      setNotice("Compare up to four products at a time. Remove one first.")
      return
    }
    const next = [...current, item]
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      setNotice("Comparison could not be saved in this browser.")
      return
    }
    setItems(next)
    setNotice("Added to comparison.")
    window.dispatchEvent(new Event(UPDATED_EVENT))
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
