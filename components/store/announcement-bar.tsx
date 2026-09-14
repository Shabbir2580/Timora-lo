"use client"

import { useEffect, useState } from "react"
import { Truck, Tag, Timer } from "lucide-react"

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(remaining / 3600)
    .toString()
    .padStart(2, "0")
  const m = Math.floor((remaining % 3600) / 60)
    .toString()
    .padStart(2, "0")
  const s = (remaining % 60).toString().padStart(2, "0")
  return `${h}:${m}:${s}`
}

export function AnnouncementBar() {
  const time = useCountdown(2 * 3600 + 15 * 60 + 32)
  return (
    <div className="bg-foreground text-background">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-xs font-medium sm:justify-between">
        <span className="hidden items-center gap-1.5 sm:flex">
          <Truck className="size-3.5" aria-hidden />
          Free delivery above ₹999
        </span>
        <span className="flex items-center gap-1.5">
          <Timer className="size-3.5" aria-hidden />
          Flash Sale ends in <span className="tabular-nums">{time}</span>
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <Tag className="size-3.5" aria-hidden />
          Use TIMORA500 — ₹500 OFF
        </span>
      </div>
    </div>
  )
}
