"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock3, LogOut, PackageCheck, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type OrderItem = {
  id: string
  order_id: string
  product_name: string
  product_slug: string
  quantity: number
  unit_price_paise: number
  line_total_paise: number
  variant: string | null
}

type CodOrder = {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  address: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  delivery_note: string | null
  subtotal_paise: number
  shipping_paise: number
  total_paise: number
  order_status: string
  payment_status: string
  payment_provider: string | null
  payment_reference: string | null
  cod_approved_by: string | null
  cod_approved_at: string | null
  cod_rejection_reason: string | null
  tracking_number: string | null
  courier_name: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
  order_items?: OrderItem[]
}

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100)

export default function AdminOrdersPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [role, setRole] = useState("")
  const [orders, setOrders] = useState<CodOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [filter, setFilter] = useState<"awaiting" | "approved" | "cancelled" | "all">("awaiting")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [deliveryForms, setDeliveryForms] = useState<Record<string, { status: string; tracking: string; courier: string }>>({})

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data, error: ordersError } = await supabase
        .from("orders")
        .select("id,customer_id,customer_name,customer_email,customer_phone,address,landmark,city,state,pincode,delivery_note,subtotal_paise,shipping_paise,total_paise,order_status,payment_status,payment_provider,payment_reference,cod_approved_by,cod_approved_at,cod_rejection_reason,tracking_number,courier_name,shipped_at,delivered_at,created_at")
        .eq("payment_provider", "cod")
        .order("created_at", { ascending: false })
      if (ordersError) throw ordersError

      const rows = (data ?? []) as CodOrder[]
      if (!rows.length) {
        setOrders([])
        return
      }

      const ids = rows.map((order) => order.id)
      const { data: itemRows, error: itemsError } = await supabase
        .from("order_items")
        .select("id,order_id,product_name,product_slug,quantity,unit_price_paise,line_total_paise,variant")
        .in("order_id", ids)
      if (itemsError) throw itemsError

      const items = (itemRows ?? []) as OrderItem[]
      setOrders(rows.map((order) => ({
        ...order,
        order_items: items.filter((item) => item.order_id === order.id),
      })))
    } catch (err) {
      setError(err instanceof Error ? `Could not load COD orders: ${err.message}` : "Could not load COD orders.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function verifyStaff() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.replace("/login?next=%2Fadmin%2Forders")
          return
        }
        const { data: staff, error: roleError } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
        if (roleError) throw roleError
        if (!staff || !["admin", "employee"].includes(staff.role)) {
          router.replace("/")
          return
        }
        if (active) {
          setRole(staff.role)
          setAuthorized(true)
          await loadOrders()
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not verify staff access.")
      } finally {
        if (active) setCheckingAccess(false)
      }
    }
    void verifyStaff()
    return () => { active = false }
  }, [router, loadOrders])

  async function reviewOrder(orderId: string, decision: "approve" | "reject", reason?: string) {
    setWorkingId(orderId)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login?next=%2Fadmin%2Forders")
        return
      }
      const { data: staff, error: roleError } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()
      if (roleError || !staff || !["admin", "employee"].includes(staff.role)) {
        throw new Error("Staff permission could not be verified.")
      }
      const { error: rpcError } = await supabase.rpc("review_cod_order", {
        p_order_id: orderId,
        p_decision: decision,
        p_rejection_reason: decision === "reject" ? (reason?.trim() || "Rejected by staff") : null,
      })
      if (rpcError) throw rpcError
      setNotice(decision === "approve"
        ? "COD order approved. It may now proceed to processing; cash is still unpaid."
        : "COD order rejected and cancelled.")
      setRejectingOrder(null)
      setRejectionReason("")
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not review this order.")
    } finally {
      setWorkingId(null)
    }
  }

  async function updateDelivery(order: CodOrder) {
    const form = deliveryForms[order.id] ?? {
      status: order.order_status === "confirmed" ? "processing" : order.order_status,
      tracking: order.tracking_number ?? "",
      courier: order.courier_name ?? "",
    }
    setWorkingId(order.id)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login?next=%2Fadmin%2Forders")
        return
      }
      const { data: staff, error: roleError } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()
      if (roleError || !staff || !["admin", "employee"].includes(staff.role)) {
        throw new Error("Staff permission could not be verified.")
      }
      const { error: rpcError } = await supabase.rpc("update_order_delivery", {
        p_order_id: order.id,
        p_new_status: form.status,
        p_tracking_number: form.tracking.trim() || null,
        p_courier_name: form.courier.trim() || null,
      })
      if (rpcError) throw rpcError
      setNotice(`Order #${order.id.slice(0, 8).toUpperCase()} updated to ${form.status.replaceAll("_", " ")}.`)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update delivery details.")
    } finally {
      setWorkingId(null)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const visibleOrders = orders.filter((order) => {
    const awaiting = order.order_status === "pending_payment" && order.payment_status === "pending"
    const approved = Boolean(order.cod_approved_at) && order.order_status !== "cancelled"
    const matchesFilter =
      filter === "all" ||
      (filter === "awaiting" && awaiting) ||
      (filter === "approved" && approved) ||
      (filter === "cancelled" && order.order_status === "cancelled")
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || [
      order.id,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.city,
      order.pincode,
      order.order_status,
      order.tracking_number,
      order.courier_name,
    ].some((value) => String(value ?? "").toLowerCase().includes(term))
    return matchesFilter && matchesSearch
  })

  if (checkingAccess) {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]"><p className="text-sm">Verifying staff access...</p></main>
  }

  if (!authorized) {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] px-5 text-white"><div className="text-center"><ShieldCheck className="mx-auto mb-3 size-9 text-[#d4af37]" /><h1 className="text-xl font-semibold">Staff access required</h1><p className="mt-2 text-sm text-white/60">{error || "Your account is not authorized to view orders."}</p><Link href="/" className="mt-5 inline-flex rounded-full border border-[#d4af37]/40 px-4 py-2 text-sm text-[#e4c878]">Return to Timora</Link></div></main>
  }

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]">
      <header className="sticky top-0 z-20 border-b border-[#d4af37]/20 bg-[#0b0b0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" aria-label="Back to admin products" className="grid size-10 place-items-center rounded-full border border-white/10 hover:border-[#d4af37]/50"><ArrowLeft className="size-4" /></Link>
            <div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">COD order review · {role}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadOrders()} disabled={loading} className="grid size-10 place-items-center rounded-full border border-white/10 hover:border-[#d4af37]/40 disabled:opacity-50" aria-label="Refresh orders"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
            <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:text-[#e4c878]"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Order management</p><h1 className="mt-2 text-3xl font-medium sm:text-4xl">Cash on Delivery</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Review COD orders before they are processed. Approval does not mean cash has been collected; payment stays pending until delivery and collection.</p></div>
          <div className="flex flex-wrap gap-2">
            {([
              ["awaiting", "Awaiting review"],
              ["approved", "Approved"],
              ["cancelled", "Cancelled"],
              ["all", "All COD orders"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`min-h-10 rounded-full px-4 text-xs font-medium transition ${filter === value ? "bg-[#d4af37] text-[#17130c]" : "border border-white/15 text-white/65 hover:border-[#d4af37]/40 hover:text-[#e4c878]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><Clock3 className="size-4 text-[#d4af37]" />Awaiting review</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => o.order_status === "pending_payment" && o.payment_status === "pending").length}</p></div>
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><PackageCheck className="size-4 text-emerald-300" />Approved</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => Boolean(o.cod_approved_at) && o.order_status !== "cancelled").length}</p></div>
          <div className="col-span-2 rounded-xl border border-white/10 bg-[#11110f] p-4 sm:col-span-1"><div className="flex items-center gap-2 text-xs text-white/50"><XCircle className="size-4 text-red-300" />Cancelled / rejected</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => o.order_status === "cancelled").length}</p></div>
        </div>

        {error && <div role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#e6d39c]">{notice}</div>}

        <div className="mt-7">
          <label className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#11110f] px-4 sm:max-w-xl">
            <Search className="size-4 shrink-0 text-white/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order ID, customer, email, phone, city or PIN code"
              aria-label="Search COD orders"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-xs text-[#e4c878] hover:text-white">
                Clear
              </button>
            )}
          </label>
          <p className="mt-2 text-xs text-white/40">Showing {visibleOrders.length} of {orders.length} COD orders</p>
        </div>

        <section className="mt-4 space-y-4">
          {loading && orders.length === 0 ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading COD orders...</p> : visibleOrders.length === 0 ? <div className="rounded-xl border border-white/10 bg-[#11110f] p-10 text-center"><PackageCheck className="mx-auto size-9 text-[#d4af37]/60" /><p className="mt-3 text-sm text-white/70">{search.trim() ? "No COD orders match your search." : filter === "awaiting" ? "No COD orders are awaiting review." : "No COD orders found in this filter."}</p><p className="mt-1 text-xs text-white/40">New COD orders will appear here after checkout is connected to the COD API.</p></div> : visibleOrders.map((order) => {
            const awaiting = order.order_status === "pending_payment" && order.payment_status === "pending"
            return <article key={order.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#11110f]">
              <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] ${awaiting ? "bg-amber-300/10 text-amber-200" : order.order_status === "cancelled" ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>{awaiting ? "Awaiting approval" : order.order_status.replaceAll("_", " ")}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/55">Payment: {order.payment_status}</span></div><p className="mt-2 text-xs text-white/40">Placed {new Date(order.created_at).toLocaleString("en-IN")}</p></div>
                <div className="text-left sm:text-right"><p className="text-xl font-semibold text-[#e4c878]">{money(order.total_paise)}</p><p className="mt-1 text-xs text-white/45">Subtotal {money(order.subtotal_paise)} · Shipping {money(order.shipping_paise)}</p></div>
              </div>
              <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                <div><h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Customer & delivery</h3><p className="mt-3 text-sm font-medium">{order.customer_name}</p><p className="mt-1 break-all text-xs text-white/60">{order.customer_email}</p><p className="mt-1 text-xs text-white/60">{order.customer_phone}</p><p className="mt-3 text-sm leading-6 text-white/75">{order.address}{order.landmark ? `, ${order.landmark}` : ""}<br />{order.city}, {order.state} — {order.pincode}</p>{order.delivery_note && <p className="mt-2 text-xs text-white/45">Note: {order.delivery_note}</p>}</div>
                <div><h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Items</h3><div className="mt-3 space-y-3">{(order.order_items ?? []).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0"><div><p className="text-sm">{item.product_name}</p>{item.variant && <p className="mt-1 text-xs text-white/40">{item.variant}</p>}<p className="mt-1 text-xs text-white/45">Qty {item.quantity} × {money(item.unit_price_paise)}</p></div><p className="shrink-0 text-sm">{money(item.line_total_paise)}</p></div>)}</div></div>
              </div>
              {(order.tracking_number || order.courier_name || order.shipped_at || order.delivered_at) && <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-black/20 p-4 sm:mx-5"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Delivery tracking</h3><div className="mt-2 grid gap-2 text-xs text-white/65 sm:grid-cols-2"><p>Courier: {order.courier_name || "Not assigned"}</p><p>Tracking number: {order.tracking_number || "Not added"}</p>{order.shipped_at && <p>Shipped: {new Date(order.shipped_at).toLocaleString("en-IN")}</p>}{order.delivered_at && <p>Delivered: {new Date(order.delivered_at).toLocaleString("en-IN")}</p>}</div></div>}
              {order.cod_rejection_reason && <p className="mx-4 mb-4 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200 sm:mx-5">Rejection reason: {order.cod_rejection_reason}</p>}
              {!awaiting && order.order_status !== "cancelled" && order.order_status !== "delivered" && <div className="border-t border-white/[0.08] p-4 sm:p-5"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Update delivery</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs text-white/60">Order status<select value={(deliveryForms[order.id]?.status ?? (order.order_status === "confirmed" ? "processing" : order.order_status))} onChange={(event) => setDeliveryForms((current) => ({ ...current, [order.id]: { status: event.target.value, tracking: current[order.id]?.tracking ?? order.tracking_number ?? "", courier: current[order.id]?.courier ?? order.courier_name ?? "" } }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#d4af37]"><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select></label><label className="text-xs text-white/60">Courier name<input value={deliveryForms[order.id]?.courier ?? order.courier_name ?? ""} onChange={(event) => setDeliveryForms((current) => ({ ...current, [order.id]: { status: current[order.id]?.status ?? (order.order_status === "confirmed" ? "processing" : order.order_status), tracking: current[order.id]?.tracking ?? order.tracking_number ?? "", courier: event.target.value } }))} maxLength={120} placeholder="e.g. Delhivery" className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#d4af37]" /></label><label className="text-xs text-white/60">Tracking number<input value={deliveryForms[order.id]?.tracking ?? order.tracking_number ?? ""} onChange={(event) => setDeliveryForms((current) => ({ ...current, [order.id]: { status: current[order.id]?.status ?? (order.order_status === "confirmed" ? "processing" : order.order_status), tracking: event.target.value, courier: current[order.id]?.courier ?? order.courier_name ?? "" } }))} maxLength={200} placeholder="Enter parcel tracking ID" className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#d4af37]" /></label></div><div className="mt-3 flex justify-end"><button type="button" disabled={workingId === order.id} onClick={() => void updateDelivery(order)} className="min-h-11 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] hover:bg-[#e6c85c] disabled:opacity-50">{workingId === order.id ? "Saving..." : "Save delivery update"}</button></div></div>}
              {order.order_status === "delivered" && <p className="border-t border-white/[0.08] px-4 py-4 text-sm text-emerald-300 sm:px-5">Delivered{order.delivered_at ? ` on ${new Date(order.delivered_at).toLocaleString("en-IN")}` : "."}</p>}
              {awaiting && <div className="flex flex-col gap-3 border-t border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-end sm:p-5">
                {rejectingOrder === order.id ? <div className="w-full space-y-3"><label className="block text-xs text-white/65">Reason for rejection (optional)<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={500} rows={2} placeholder="e.g. Invalid address or unable to deliver" className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 py-2 text-sm outline-none focus:border-[#d4af37]" /></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setRejectingOrder(null); setRejectionReason("") }} className="min-h-10 rounded-full border border-white/15 px-4 text-sm text-white/70">Keep order</button><button type="button" disabled={workingId === order.id} onClick={() => void reviewOrder(order.id, "reject", rejectionReason)} className="min-h-10 rounded-full bg-red-500/15 px-4 text-sm font-medium text-red-200 hover:bg-red-500/25 disabled:opacity-50">{workingId === order.id ? "Rejecting..." : "Confirm rejection"}</button></div></div> : <><button type="button" disabled={workingId === order.id} onClick={() => setRejectingOrder(order.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-400/30 px-5 text-sm text-red-200 hover:bg-red-400/10 disabled:opacity-50"><XCircle className="size-4" />Reject order</button><button type="button" disabled={workingId === order.id} onClick={() => void reviewOrder(order.id, "approve")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] hover:bg-[#e6c85c] disabled:cursor-wait disabled:opacity-50"><CheckCircle2 className="size-4" />{workingId === order.id ? "Approving..." : "Approve COD order"}</button></>}
              </div>}
            </article>
          })}
        </section>
        <p className="mt-8 text-center text-[11px] leading-5 text-white/35">Timora staff workspace · Approval is recorded in Supabase. Payment remains pending until cash is collected.</p>
      </div>
    </main>
  )
}
