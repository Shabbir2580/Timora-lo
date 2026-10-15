"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock3, MessageCircle, Package, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type EligibleOrder = { id: string; created_at: string; delivered_at: string | null; order_status: string; total_paise: number }
type RequestRow = { id: string; order_id: string; reason: string; customer_note: string; status: string; created_at: string }

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100)
const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
const reasons = [
  { value: "damaged", label: "Item arrived damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "missing_item", label: "Item or accessory missing" },
  { value: "not_as_described", label: "Item differs from description" },
  { value: "other", label: "Other issue" },
]
const statusTone = (status: string) => ["approved", "refunded", "received"].includes(status) ? "text-emerald-200" : status === "rejected" ? "text-red-200" : "text-[#e3ca96]"

export default function ReturnsPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<EligibleOrder[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [selectedOrder, setSelectedOrder] = useState("")
  const [reason, setReason] = useState("damaged")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.replace("/login?next=%2Freturns"); return }
      const [ordersResult, requestsResult] = await Promise.all([
        supabase.from("orders").select("id,created_at,delivered_at,order_status,total_paise").eq("customer_id", user.id).eq("order_status", "delivered").not("delivered_at", "is", null).order("delivered_at", { ascending: false }),
        supabase.from("return_requests").select("id,order_id,reason,customer_note,status,created_at").eq("customer_id", user.id).order("created_at", { ascending: false }),
      ])
      if (ordersResult.error) throw ordersResult.error
      if (requestsResult.error) throw new Error("Return requests are not set up yet. The site owner must apply the Timora return-request migration in Supabase.")
      const rows = (ordersResult.data ?? []) as EligibleOrder[]
      const requestRows = (requestsResult.data ?? []) as RequestRow[]
      setOrders(rows)
      setRequests(requestRows)
      const params = new URLSearchParams(window.location.search)
      const requestedId = params.get("orderId") || ""
      const available = rows.find(order => order.id === requestedId && !requestRows.some(r => r.order_id === requestedId))
      const firstAvailable = rows.find(order => !requestRows.some(r => r.order_id === order.id))
      setSelectedOrder(available?.id || firstAvailable?.id || "")
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load your return requests.") }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("")
    if (!selectedOrder) { setError("Choose an eligible delivered order."); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Please sign in again.")
      const { error: insertError } = await supabase.from("return_requests").insert({
        order_id: selectedOrder,
        customer_id: user.id,
        reason,
        customer_note: note.trim(),
      })
      if (insertError) throw new Error(insertError.code === "23505" ? "A return request already exists for this order." : insertError.message)
      setNotice("Your return request was submitted. Timora support will review it; this does not mean a refund has been approved.")
      setNote("")
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit the return request.") }
    finally { setSaving(false) }
  }

  const availableOrders = orders.filter(order => !requests.some(request => request.order_id === order.id))
  const selected = orders.find(order => order.id === selectedOrder)

  return <main className="min-h-screen bg-[#0b0b0a] px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-10"><div className="mx-auto max-w-4xl">
    <Link href="/account" className="inline-flex min-h-10 items-center gap-2 text-sm text-white/60 hover:text-[#e3ca96]"><ArrowLeft className="size-4"/> My account</Link>
    <header className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a96e]">After your purchase</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Returns & customer care</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Request help for a delivered order and follow the review status here. Submitting a request does not automatically approve a return or refund.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200">{notice}</p>}
    {loading ? <div className="mt-6 rounded-2xl border border-white/10 p-8 text-center text-sm text-white/50">Loading eligible orders…</div> : <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border border-[#c9a96e]/25 bg-[#15140f] p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><RotateCcw className="size-5 text-[#c9a96e]"/> Request a return</h2><p className="mt-2 text-xs leading-5 text-white/45">Delivered orders appear below. Timora support will confirm eligibility, pickup and refund options according to the published store policy.</p>
        {availableOrders.length ? <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs text-white/60">Delivered order<select value={selectedOrder} onChange={e=>setSelectedOrder(e.target.value)} required className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#c9a96e]">{availableOrders.map(order=><option key={order.id} value={order.id}>#{order.id.slice(0,8).toUpperCase()} · {money(order.total_paise)} · {order.delivered_at ? date(order.delivered_at) : "Delivered date unavailable"}</option>)}</select></label>
          <label className="block text-xs text-white/60">Reason<select value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#c9a96e]">{reasons.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="block text-xs text-white/60">Explain the issue (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1500} rows={4} placeholder="Tell us what happened. Please don't include payment passwords or OTPs." className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0b0a] px-3 py-3 text-sm text-white outline-none focus:border-[#c9a96e]"/></label>
          {selected && <p className="rounded-xl border border-white/10 p-3 text-xs text-white/45">Selected order placed {date(selected.created_at)}. Return request will be linked to this order.</p>}
          <button disabled={saving || !selectedOrder} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#c9a96e] px-5 text-sm font-semibold text-[#17130c] disabled:opacity-50">{saving ? "Submitting…" : "Submit return request"}<CheckCircle2 className="size-4"/></button>
        </form> : <div className="mt-5 rounded-xl border border-dashed border-white/10 p-5"><Package className="size-6 text-white/30"/><p className="mt-3 text-sm font-medium">No eligible delivered orders to request</p><p className="mt-1 text-xs leading-5 text-white/45">Only delivered orders are listed. If you need help with another order, contact customer care.</p><Link href="/orders" className="mt-3 inline-flex text-sm text-[#e3ca96]">View all orders →</Link></div>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><h2 className="text-lg font-semibold">Your requests</h2><p className="mt-1 text-xs text-white/40">Status updates from Timora support</p>
        {requests.length ? <div className="mt-4 space-y-3">{requests.map(request=><article key={request.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-white/55">Order #{request.order_id.slice(0,8).toUpperCase()}</p><p className="mt-2 text-sm">{reasons.find(r=>r.value===request.reason)?.label || "Return request"}</p></div><span className={`shrink-0 text-xs capitalize ${statusTone(request.status)}`}>{request.status.replace(/_/g," ")}</span></div>{request.customer_note && <p className="mt-2 text-xs leading-5 text-white/50">{request.customer_note}</p>}<p className="mt-3 flex items-center gap-1 text-[11px] text-white/35"><Clock3 className="size-3"/>Submitted {date(request.created_at)}</p><Link href={`/orders/${request.order_id}`} className="mt-3 inline-flex text-xs text-[#e3ca96]">View order details →</Link></article>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/45">You haven't submitted any return requests.</p>}
      </section>
    </div>}
    <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 font-semibold"><MessageCircle className="size-4 text-[#c9a96e]"/> Need help sooner?</h2><p className="mt-1 text-xs text-white/45">Contact Timora customer care and include your order reference.</p></div><a href="https://wa.me/919909231028" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#c9a96e]/35 px-5 text-sm text-[#e3ca96] hover:bg-[#c9a96e]/10">Contact customer care</a></section>
  </div></main>
}
