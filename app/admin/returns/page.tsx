"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock3, LogOut, RefreshCw, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type ReturnRow = {
  id: string; order_id: string; customer_id: string; reason: string; customer_note: string; status: string
  staff_note: string | null; refund_amount_paise: number | null; created_at: string; updated_at: string
}
type OrderInfo = { id: string; customer_name: string; customer_email: string; customer_phone: string; total_paise: number; order_status: string; payment_status: string; payment_provider: string | null }

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100)
const reasonLabel: Record<string, string> = { damaged: "Item arrived damaged", wrong_item: "Wrong item received", missing_item: "Item or accessory missing", not_as_described: "Item differs from description", other: "Other issue" }
const statuses = ["requested", "under_review", "approved", "rejected", "pickup_scheduled", "received", "refund_pending", "refunded", "closed"]

export default function AdminReturnsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [role, setRole] = useState("")
  const [rows, setRows] = useState<ReturnRow[]>([])
  const [orders, setOrders] = useState<Record<string, OrderInfo>>({})
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [refunds, setRefunds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase.from("return_requests").select("*").order("created_at", { ascending: false })
      if (queryError) throw queryError
      const result = (data ?? []) as ReturnRow[]
      setRows(result)
      result.forEach(row => {
        setStatusDrafts(current => ({ ...current, [row.id]: row.status }))
        setNotes(current => ({ ...current, [row.id]: row.staff_note ?? "" }))
        setRefunds(current => ({ ...current, [row.id]: row.refund_amount_paise == null ? "" : String(row.refund_amount_paise / 100) }))
      })
      const ids = Array.from(new Set(result.map(row => row.order_id)))
      if (ids.length) {
        const { data: orderRows, error: orderError } = await supabase.from("orders").select("id,customer_name,customer_email,customer_phone,total_paise,order_status,payment_status,payment_provider").in("id", ids)
        if (orderError) throw orderError
        setOrders(Object.fromEntries(((orderRows ?? []) as OrderInfo[]).map(order => [order.id, order])))
      } else setOrders({})
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load return requests.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    async function verify() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace("/login?next=%2Fadmin%2Freturns"); return }
        const { data: staff, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staff || !["admin", "employee"].includes(staff.role)) { router.replace("/"); return }
        if (active) { setRole(staff.role); setAuthorized(true); await load() }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not verify staff access.") }
      finally { if (active) setChecking(false) }
    }
    void verify()
    return () => { active = false }
  }, [router, load])

  async function save(row: ReturnRow) {
    if (role !== "admin") { setError("Only an admin can update return request decisions."); return }
    const status = statusDrafts[row.id] || row.status
    const refundText = refunds[row.id]?.trim() ?? ""
    const refundAmount = refundText === "" ? null : Number(refundText)
    if (refundAmount !== null && (!Number.isFinite(refundAmount) || refundAmount < 0)) { setError("Enter a valid non-negative refund amount."); return }
    if (status === "refunded" && refundAmount === null) { setError("Enter the actual refund amount before marking a request refunded."); return }
    setWorking(row.id); setError(""); setNotice("")
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Please sign in again.")
      const { data: staff, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
      if (roleError || staff?.role !== "admin") throw new Error("Admin permission could not be verified.")
      const { error: updateError } = await supabase.from("return_requests").update({
        status,
        staff_note: (notes[row.id] ?? "").trim() || null,
        refund_amount_paise: refundAmount === null ? null : Math.round(refundAmount * 100),
      }).eq("id", row.id)
      if (updateError) throw updateError
      setNotice("Return request updated. A refund is only recorded here; issue the actual refund through the payment provider separately.")
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update return request.") }
    finally { setWorking(null) }
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login"); router.refresh()
  }

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]">Verifying staff access…</main>
  if (!authorized) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] px-5 text-white"><div className="text-center"><ShieldCheck className="mx-auto size-9 text-[#d4af37]"/><h1 className="mt-3 text-xl font-semibold">Staff access required</h1><Link href="/" className="mt-4 inline-flex text-sm text-[#e4c878]">Return to Timora</Link></div></main>

  return <main className="min-h-screen bg-[#0b0b0a] px-4 py-7 text-[#f8f8f8] sm:px-6 sm:py-9"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d4af37]/20 pb-5"><div className="flex items-center gap-3"><Link href="/admin/orders" aria-label="Back to orders" className="grid size-10 place-items-center rounded-full border border-white/10"><ArrowLeft className="size-4"/></Link><div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Returns desk · {role}</p></div></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="grid size-10 place-items-center rounded-full border border-white/10" aria-label="Refresh return requests"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`}/></button><button onClick={logout} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70"><LogOut className="size-4"/>Sign out</button></div></header>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Customer service</p><h1 className="mt-2 text-3xl font-semibold">Return requests</h1><p className="mt-2 text-sm text-white/50">Review each request, record decisions and track refund progress.</p></div><div className="rounded-xl border border-white/10 px-4 py-3"><p className="text-xs text-white/45">Total requests</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div></div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200">{notice}</p>}
    <div className="mt-6 space-y-4">{loading && !rows.length ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading requests…</p> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center"><Clock3 className="mx-auto size-8 text-white/30"/><p className="mt-3 font-medium">No return requests yet</p><p className="mt-1 text-sm text-white/45">Customer requests will appear here once submitted.</p></div> : rows.map(row => { const order = orders[row.order_id]; return <article key={row.id} className="rounded-2xl border border-white/10 bg-[#11110f] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Order #{row.order_id.slice(0,8).toUpperCase()}</h2><span className="rounded-full bg-[#d4af37]/10 px-2.5 py-1 text-xs capitalize text-[#e4c878]">{row.status.replace(/_/g," ")}</span></div><p className="mt-2 text-xs text-white/40">Request created {new Date(row.created_at).toLocaleString("en-IN")}</p><p className="mt-3 text-sm">{reasonLabel[row.reason] || row.reason}</p>{row.customer_note && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-white/55">{row.customer_note}</p>}</div><div className="sm:text-right"><p className="text-sm font-medium">{order?.customer_name || "Customer"}</p><p className="mt-1 break-all text-xs text-white/50">{order?.customer_email}</p><p className="mt-1 text-xs text-white/50">{order?.customer_phone}</p><p className="mt-2 text-lg font-semibold text-[#e4c878]">{order ? money(order.total_paise) : "Order unavailable"}</p><p className="text-xs capitalize text-white/40">{order?.payment_provider || "Payment method unknown"} · {order?.payment_status || "status unknown"}</p><Link href={`/orders/${row.order_id}`} className="mt-3 inline-flex text-xs text-[#e4c878]">View order →</Link></div></div>
      <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3"><label className="text-xs text-white/55">Request status<select disabled={role !== "admin"} value={statusDrafts[row.id] || row.status} onChange={e=>setStatusDrafts(current=>({...current,[row.id]:e.target.value}))} className="mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white disabled:opacity-50">{statuses.map(status=><option key={status} value={status}>{status.replace(/_/g," ")}</option>)}</select></label><label className="text-xs text-white/55">Actual refund amount (₹)<input disabled={role !== "admin"} type="number" min="0" step="0.01" value={refunds[row.id] ?? ""} onChange={e=>setRefunds(current=>({...current,[row.id]:e.target.value}))} placeholder="Only after issuing refund" className="mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white disabled:opacity-50"/></label><label className="text-xs text-white/55 sm:col-span-1">Internal staff note<textarea disabled={role !== "admin"} value={notes[row.id] ?? ""} onChange={e=>setNotes(current=>({...current,[row.id]:e.target.value}))} maxLength={1500} rows={2} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 py-2 text-sm text-white disabled:opacity-50"/></label></div>
      {role === "admin" && <div className="mt-4 flex justify-end"><button disabled={working === row.id} onClick={() => void save(row)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] disabled:opacity-50">{working === row.id ? "Saving…" : "Save decision"}<CheckCircle2 className="size-4"/></button></div>}
    </article>})}</div>
    <p className="mt-8 text-center text-xs leading-5 text-white/35">Changing a request to “refunded” does not move money. Process the refund through the payment provider first, then record the confirmed amount here.</p>
  </div></main>
}
