"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BellRing, CheckCircle2, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type WatchItem = { id: string; slug: string; name: string; price: number; inStock: boolean; updatedAt: string }
type AlertRow = { alert_type: "price_drop" | "back_in_stock"; active: boolean }
const KEY = "timora-price-stock-watch-v1"

export function PriceStockAlertButton({ item }: { item: WatchItem }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [serverAlertsReady, setServerAlertsReady] = useState(false)
  const [priceActive, setPriceActive] = useState(false)
  const [stockActive, setStockActive] = useState(false)
  const [localWatching, setLocalWatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const { id, slug, name, price, inStock, updatedAt } = item

  useEffect(() => {
    let cancelled = false

    async function loadAlerts() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (cancelled) return

        setUserId(user?.id ?? null)
        if (user) {
          const { data, error: queryError } = await supabase
            .from("customer_product_alerts")
            .select("alert_type,active")
            .eq("customer_id", user.id)
            .eq("product_id", id)
          if (cancelled) return
          if (queryError) {
            setServerAlertsReady(false)
            try {
              const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, WatchItem>
              setLocalWatching(Boolean(parsed[id]))
            } catch {
              setLocalWatching(false)
            }
            setError("Server alerts need the latest Timora database migration. Browser tracking remains available below.")
          } else {
            const rows = (data ?? []) as AlertRow[]
            setPriceActive(rows.some((row) => row.alert_type === "price_drop" && row.active))
            setStockActive(rows.some((row) => row.alert_type === "back_in_stock" && row.active))
            setServerAlertsReady(true)
          }
        } else {
          const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, WatchItem>
          const previous = parsed[id]
          setLocalWatching(Boolean(previous))
          if (previous) {
            const messages: string[] = []
            if (price < previous.price) messages.push("Price dropped to ₹" + price.toLocaleString("en-IN") + ".")
            if (!previous.inStock && inStock) messages.push("This product is back in stock.")
            if (messages.length) setNotice(messages.join(" "))
            parsed[id] = { id, slug, name, price, inStock, updatedAt }
            window.localStorage.setItem(KEY, JSON.stringify(parsed))
          }
        }
      } catch {
        if (!cancelled) setError("Alerts could not be loaded. Please refresh and try again.")
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    }

    void loadAlerts()
    return () => { cancelled = true }
  }, [id, slug, name, price, inStock, updatedAt])

  async function toggleServerAlerts() {
    if (!userId || !serverAlertsReady || saving) return
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const shouldEnable = !(priceActive || stockActive)
      const rows = [
        { customer_id: userId, product_id: id, alert_type: "price_drop", active: shouldEnable, updated_at: new Date().toISOString() },
        { customer_id: userId, product_id: id, alert_type: "back_in_stock", active: shouldEnable, updated_at: new Date().toISOString() },
      ]
      const { error: saveError } = await supabase
        .from("customer_product_alerts")
        .upsert(rows, { onConflict: "customer_id,product_id,alert_type" })
      if (saveError) throw saveError
      setPriceActive(shouldEnable)
      setStockActive(shouldEnable)
      setNotice(shouldEnable
        ? "Alerts enabled. You'll see an in-app notification if the price drops or the product comes back in stock."
        : "Price-drop and restock alerts turned off.")
    } catch {
      setError("We couldn't update your alerts. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function toggleLocalTracking() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, WatchItem>
      if (parsed[id]) {
        delete parsed[id]
        window.localStorage.setItem(KEY, JSON.stringify(parsed))
        setLocalWatching(false)
        setNotice("Browser tracking turned off.")
      } else {
        parsed[id] = item
        window.localStorage.setItem(KEY, JSON.stringify(parsed))
        setLocalWatching(true)
        setNotice("We'll check for price drops and restocks when you revisit this product in this browser.")
      }
      setError("")
    } catch {
      setError("Your browser could not save this alert. Check local storage settings and try again.")
    }
  }

  const serverWatching = priceActive || stockActive

  return <section className="mt-4 rounded-xl border border-[#c9a96e]/25 bg-[#c9a96e]/[0.05] p-3 sm:p-4">
    <div className="flex items-start gap-3">
      <BellRing className="mt-0.5 size-4 shrink-0 text-[#d4af37]"/>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/85">Price-drop & back-in-stock alerts</p>
        <p className="mt-1 text-xs leading-5 text-white/45">{userId
          ? serverAlertsReady
            ? "Get an in-app notification when the price drops or stock returns. These are not email or push alerts."
            : "Server-side alerts are unavailable until the database migration is applied. Browser tracking remains available."
          : "Browser tracking works when you revisit this product. Sign in to enable server-side in-app alerts."}</p>
      </div>
      {authReady && userId && serverAlertsReady ? (
        <button type="button" disabled={saving} onClick={() => void toggleServerAlerts()} aria-pressed={serverWatching} className="min-h-9 shrink-0 rounded-full border border-[#c9a96e]/40 px-3 text-xs font-medium text-[#dfc797] hover:bg-[#c9a96e]/10 disabled:opacity-50">{saving ? "Saving…" : serverWatching ? "Stop alerts" : "Enable alerts"}</button>
      ) : (
        <button type="button" onClick={toggleLocalTracking} aria-pressed={localWatching} className="min-h-9 shrink-0 rounded-full border border-[#c9a96e]/40 px-3 text-xs font-medium text-[#dfc797] hover:bg-[#c9a96e]/10">{localWatching ? "Stop tracking" : "Track in browser"}</button>
      )}
    </div>
    {!userId && authReady && <Link href={"/login?next=" + encodeURIComponent("/product/" + slug)} className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-[#e3ca96] hover:text-white"><LogIn className="size-3.5"/> Sign in for in-app alerts</Link>}
    {notice && <p role="status" className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-200"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0"/>{notice}</p>}
    {error && <p role="alert" className="mt-3 text-xs leading-5 text-amber-200">{error}</p>}
  </section>
}
