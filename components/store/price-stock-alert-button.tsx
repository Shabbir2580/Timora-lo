"use client"

import { useEffect, useState } from "react"
import { BellRing, CheckCircle2 } from "lucide-react"

type WatchItem = { id: string; slug: string; name: string; price: number; inStock: boolean; updatedAt: string }
const KEY = "timora-price-stock-watch-v1"

export function PriceStockAlertButton({ item }: { item: WatchItem }) {
  const [watching, setWatching] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, WatchItem>
      const previous = parsed[item.id]
      setWatching(Boolean(previous))
      if (previous) {
        const messages: string[] = []
        if (item.price < previous.price) messages.push("Price dropped to ₹" + item.price.toLocaleString("en-IN") + ".")
        if (!previous.inStock && item.inStock) messages.push("This product is back in stock.")
        if (messages.length) setNotice(messages.join(" "))
        parsed[item.id] = item
        window.localStorage.setItem(KEY, JSON.stringify(parsed))
      }
    } catch {
      setWatching(false)
    }
  }, [item])

  function toggle() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, WatchItem>
      if (parsed[item.id]) {
        delete parsed[item.id]
        window.localStorage.setItem(KEY, JSON.stringify(parsed))
        setWatching(false)
        setNotice("Price and stock tracking turned off.")
      } else {
        parsed[item.id] = item
        window.localStorage.setItem(KEY, JSON.stringify(parsed))
        setWatching(true)
        setNotice("We'll check for price drops and restocks when you revisit Timora in this browser.")
      }
    } catch {
      setNotice("Your browser could not save this alert. Check local storage settings and try again.")
    }
  }

  return <section className="mt-4 rounded-xl border border-[#c9a96e]/25 bg-[#c9a96e]/[0.05] p-3 sm:p-4">
    <div className="flex items-start gap-3">
      <BellRing className="mt-0.5 size-4 shrink-0 text-[#d4af37]"/>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/85">Price-drop & back-in-stock alerts</p>
        <p className="mt-1 text-xs leading-5 text-white/45">Browser-based alerts appear when you revisit this product. They are not email or push notifications.</p>
      </div>
      <button type="button" onClick={toggle} aria-pressed={watching} className="min-h-9 shrink-0 rounded-full border border-[#c9a96e]/40 px-3 text-xs font-medium text-[#dfc797] hover:bg-[#c9a96e]/10">{watching ? "Stop tracking" : "Track product"}</button>
    </div>
    {notice && <p role="status" className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-200"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0"/>{notice}</p>}
  </section>
}
