"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, CheckCheck, Circle, CreditCard, PackageCheck, Tag, Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type CustomerNotification = {
  id: string
  notification_type: string
  title: string
  message: string
  href: string
  read_at: string | null
  created_at: string
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  })
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "payment_confirmed") return <CreditCard className="size-5"/>
  if (type === "order_shipped" || type === "tracking_updated") return <Truck className="size-5"/>
  if (type === "order_delivered" || type === "back_in_stock") return <PackageCheck className="size-5"/>
  if (type === "price_drop") return <Tag className="size-5"/>
  return <Bell className="size-5"/>
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.replace("/login?next=%2Fnotifications")
        return
      }
      const { data, error: queryError } = await supabase
        .from("customer_notifications")
        .select("id,notification_type,title,message,href,read_at,created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
      if (queryError) {
        if (queryError.code === "42P01" || queryError.code === "PGRST205") {
          throw new Error("Notifications are not active in the database yet. The site owner must apply the Timora customer-notifications migration.")
        }
        throw queryError
      }
      setNotifications((data ?? []) as CustomerNotification[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notifications could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function markRead(id: string) {
    const notification = notifications.find((item) => item.id === id)
    if (!notification || notification.read_at) return
    setError("")
    const readAt = new Date().toISOString()
    const supabase = createClient()
    const { error: updateError } = await supabase.from("customer_notifications").update({ read_at: readAt }).eq("id", id)
    if (updateError) {
      setError("We couldn't mark that notification as read. Please try again.")
      return
    }
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: readAt } : item))
  }

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.read_at)
    if (!unread.length) return
    setSaving(true)
    setError("")
    const readAt = new Date().toISOString()
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setSaving(false)
      router.replace("/login?next=%2Fnotifications")
      return
    }
    const { error: updateError } = await supabase.from("customer_notifications").update({ read_at: readAt }).eq("customer_id", user.id).is("read_at", null)
    if (updateError) {
      setError("We couldn't update your notifications. Please try again.")
    } else {
      setNotifications((current) => current.map((item) => item.read_at ? item : { ...item, read_at: readAt }))
      setNotice("All notifications marked as read.")
    }
    setSaving(false)
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length

  return (
    <main className="min-h-screen bg-[#0b0b0a] px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/account" className="inline-flex min-h-10 items-center gap-2 text-sm text-white/60 transition hover:text-[#e3ca96]"><ArrowLeft className="size-4"/> My account</Link>
        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a96e]">Stay in the loop</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold sm:text-4xl"><Bell className="size-7 text-[#c9a96e]"/> Notifications</h1><p className="mt-2 text-sm text-white/50">Order, payment, price-drop and restock updates in one place.</p></div>
          <button type="button" disabled={!unreadCount || saving} onClick={() => void markAllRead()} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-[#c9a96e]/30 px-4 text-sm text-[#e3ca96] transition hover:bg-[#c9a96e]/10 disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck className="size-4"/>{saving ? "Updating…" : "Mark all as read"}</button>
        </header>

        <div className="mt-5 flex items-center justify-between border-b border-white/[0.08] pb-3 text-xs text-white/40"><span>{notifications.length} recent notifications</span><span>{unreadCount} unread</span></div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-200">{notice}</p>}

        {loading ? <div className="py-16 text-center text-sm text-white/45">Loading notifications…</div> : notifications.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 px-6 py-14 text-center"><Bell className="mx-auto size-8 text-[#c9a96e]/70"/><h2 className="mt-4 text-lg font-semibold">You’re all caught up</h2><p className="mt-2 text-sm text-white/45">Updates about your orders will appear here.</p><Link href="/orders" className="mt-5 inline-flex min-h-10 items-center rounded-full bg-[#c9a96e] px-4 text-sm font-semibold text-[#17130c] hover:bg-[#dfc797]">View your orders</Link></div>
        ) : (
          <div className="mt-4 space-y-3">
            {notifications.map((item) => (
              <article key={item.id} className={`rounded-2xl border p-4 transition sm:p-5 ${item.read_at ? "border-white/[0.08] bg-white/[0.015]" : "border-[#c9a96e]/25 bg-[#c9a96e]/[0.045]"}`}>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#c9a96e]/20 bg-[#c9a96e]/[0.08] text-[#dfc797]"><NotificationIcon type={item.notification_type}/></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold sm:text-base">{item.title}</h2>{!item.read_at && <Circle aria-label="Unread" className="mt-1 size-2.5 shrink-0 fill-[#c9a96e] text-[#c9a96e]"/>}</div>
                    <p className="mt-1 text-sm leading-6 text-white/55">{item.message}</p>
                    <p className="mt-2 text-[11px] text-white/35">{formatDate(item.created_at)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <Link href={item.href} onClick={() => { if (!item.read_at) void markRead(item.id) }} className="inline-flex min-h-9 items-center text-xs font-semibold text-[#e3ca96] hover:text-white">View details <span aria-hidden="true" className="ml-1">→</span></Link>
                      {!item.read_at && <button type="button" onClick={() => void markRead(item.id)} className="min-h-9 text-xs text-white/45 hover:text-white">Mark as read</button>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
