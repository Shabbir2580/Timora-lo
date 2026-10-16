"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Banknote, CheckCircle2, Clock3, CreditCard, LogOut, PackageCheck, RefreshCw, Search, ShieldCheck, Truck, XCircle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { InvoiceButton } from "@/components/store/invoice-button"

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
  discount_paise: number
  coupon_code: string | null
  total_paise: number
  order_status: string
  payment_status: string
  payment_provider: string | null
  payment_reference: string | null
  cod_approved_by: string | null
  cod_approved_at: string | null
  cod_rejection_reason: string | null
  cod_collected_at?: string | null
  tracking_number?: string | null
  courier_name?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  payment_verified_at?: string | null
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
  const [filter, setFilter] = useState<"awaiting" | "all" | "cod" | "payment">("all")
  const [search, setSearch] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [courierName, setCourierName] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      // Expire old unpaid orders to restore reserved stock, but never let this
      // housekeeping RPC prevent staff from viewing current orders.
      const { error: expiryError } = await supabase.rpc("expire_stale_pending_orders")
      if (expiryError) {
        console.warn("Pending-order expiry did not run; continuing to load orders:", expiryError.message)
      }
      // Supabase/PostgREST may cap a response at its configured row limit.
      // Fetch every page explicitly so summary cards and CSV export don't silently
      // operate on only the first page of order history.
      const pageSize = 500
      const rows: CodOrder[] = []
      for (let offset = 0; ; offset += pageSize) {
        const { data, error: ordersError } = await supabase
          .from("orders")
          .select("id,customer_id,customer_name,customer_email,customer_phone,address,landmark,city,state,pincode,delivery_note,subtotal_paise,shipping_paise,discount_paise,coupon_code,total_paise,order_status,payment_status,payment_provider,payment_reference,cod_approved_by,cod_approved_at,cod_rejection_reason,cod_collected_at,tracking_number,courier_name,shipped_at,delivered_at,payment_verified_at,created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1)
        if (ordersError) throw ordersError
        const page = (data ?? []) as CodOrder[]
        rows.push(...page)
        if (page.length < pageSize) break
      }

      if (!rows.length) {
        setOrders([])
        return
      }

      // An order can contain up to 50 lines. Keep each batch at 10 orders so
      // item rows stay below common PostgREST response caps (at most 500 rows).
      const items: OrderItem[] = []
      const itemChunkSize = 10
      for (let offset = 0; offset < rows.length; offset += itemChunkSize) {
        const ids = rows.slice(offset, offset + itemChunkSize).map((order) => order.id)
        const { data: itemRows, error: itemsError } = await supabase
          .from("order_items")
          .select("id,order_id,product_name,product_slug,quantity,unit_price_paise,line_total_paise,variant")
          .in("order_id", ids)
        if (itemsError) throw itemsError
        items.push(...((itemRows ?? []) as OrderItem[]))
      }

      const itemsByOrder = new Map<string, OrderItem[]>()
      for (const item of items) {
        const group = itemsByOrder.get(item.order_id) ?? []
        group.push(item)
        itemsByOrder.set(item.order_id, group)
      }
      setOrders(rows.map((order) => ({
        ...order,
        order_items: itemsByOrder.get(order.id) ?? [],
      })))
    } catch (err) {
      setError(err instanceof Error ? `Could not load orders: ${err.message}` : "Could not load orders.")
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

  async function runStaffRpc(name: "verify_order_payment" | "update_order_delivery" | "mark_cod_collected", args: Record<string, unknown>, successMessage: string) {
    setWorkingId(String(args.p_order_id ?? ""))
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.replace("/login?next=%2Fadmin%2Forders")
        return
      }
      const { data: staff, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
      if (roleError || !staff || !["admin", "employee"].includes(staff.role)) throw new Error("Staff permission could not be verified.")
      const { error: rpcError } = await supabase.rpc(name, args as never)
      if (rpcError) throw rpcError
      setNotice(successMessage)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "The order could not be updated.")
    } finally {
      setWorkingId(null)
    }
  }

  async function advanceDelivery(order: CodOrder) {
    const next = order.order_status === "confirmed" ? "processing" : order.order_status === "processing" ? "shipped" : order.order_status === "shipped" ? "delivered" : null
    if (!next) return
    if (next === "shipped" && (!trackingNumber.trim() || !courierName.trim())) {
      setError("Enter both courier name and tracking number before marking an order shipped.")
      return
    }
    await runStaffRpc("update_order_delivery", {
      p_order_id: order.id,
      p_new_status: next,
      p_tracking_number: next === "shipped" ? trackingNumber.trim() : null,
      p_courier_name: next === "shipped" ? courierName.trim() : null,
    }, `Order marked ${next}.`)
    if (next === "shipped") { setTrackingNumber(""); setCourierName("") }
  }

  async function deleteOrder(order: CodOrder) {
    if (role !== "admin") {
      setError("Only an administrator can permanently delete orders.")
      return
    }

    const confirmed = window.confirm(
      `Permanently delete order #${order.id.slice(0, 8).toUpperCase()} for ${order.customer_name} (${money(order.total_paise)})? This removes the order and its items and cannot be undone. Paid order records should normally be retained for accounting.`
    )
    if (!confirmed) return

    setWorkingId(order.id)
    setError("")
    setNotice("")
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

      if (roleError || staff?.role !== "admin") {
        throw new Error("Only an administrator can permanently delete orders.")
      }

      const { data: deleteResult, error: deleteError } = await supabase.rpc("admin_delete_order", {
        p_order_id: order.id,
      })
      if (deleteError) {
        const message = deleteError.message || "Unknown database error."
        if (message.includes("admin_delete_order") && (message.includes("schema cache") || message.includes("Could not find the function"))) {
          throw new Error("Order deletion is not enabled in the database yet. Apply supabase/migrations/202610160006_guard_admin_order_deletion.sql in the Timora Supabase SQL Editor, then try again.")
        }
        throw new Error(message)
      }
      const result = deleteResult as { success?: boolean; order_id?: string } | null
      if (!result?.success || result.order_id !== order.id) {
        throw new Error("The database did not confirm that this order was deleted. Refresh the page and try again.")
      }

      // Remove it immediately after the database confirms deletion, then refresh
      // the authoritative list so a failed refresh does not make the delete feel ignored.
      setOrders((current) => current.filter((item) => item.id !== order.id))
      setNotice(`Order #${order.id.slice(0, 8).toUpperCase()} deleted.`)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this order.")
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

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const collectedThisMonth = orders.reduce((sum, order) => {
    if (order.order_status === "cancelled" || order.payment_status !== "paid") return sum
    const collectedAt = order.payment_provider === "cod"
      ? order.cod_collected_at
      : order.payment_verified_at
    if (!collectedAt) return sum
    const collectedDate = new Date(collectedAt)
    return collectedDate >= monthStart && collectedDate <= now ? sum + Number(order.total_paise || 0) : sum
  }, 0)
  const paymentsCollectedThisMonth = orders.filter((order) => {
    if (order.order_status === "cancelled" || order.payment_status !== "paid") return false
    const collectedAt = order.payment_provider === "cod" ? order.cod_collected_at : order.payment_verified_at
    if (!collectedAt) return false
    const date = new Date(collectedAt)
    return date >= monthStart && date <= now
  }).length
  const ordersPlacedThisMonth = orders.filter((order) => {
    const date = new Date(order.created_at)
    return date >= monthStart && date <= now && order.order_status !== "cancelled"
  }).length

  const query = search.trim().toLowerCase()
  const visibleOrders = orders.filter((order) => {
    const matchesFilter = filter === "all"
      || (filter === "awaiting" && order.order_status === "pending_payment" && order.payment_status === "pending")
      || (filter === "cod" && order.payment_provider === "cod")
      || (filter === "payment" && order.payment_status !== "paid" && order.order_status !== "cancelled")
    const matchesSearch = !query || [order.id, order.customer_name, order.customer_email, order.customer_phone, order.pincode, order.tracking_number ?? ""].join(" ").toLowerCase().includes(query)
    return matchesFilter && matchesSearch
  })

  function exportVisibleOrders() {
    if (role !== "admin" || visibleOrders.length === 0) return
    const cell = (value: unknown) => {
      let text = value == null ? "" : String(value)
      // Prevent spreadsheet formula injection from customer-controlled text fields.
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text
      return '"' + text.replace(/"/g, '""') + '"'
    }
    const headers = [
      "Order ID", "Created At", "Customer", "Email", "Phone", "Address",
      "City", "State", "PIN Code", "Order Status", "Payment Status",
      "Payment Method", "Subtotal (paise)", "Shipping (paise)", "Discount (paise)",
      "Total (paise)", "Coupon", "Tracking Number", "Courier", "Items",
    ]
    const rows = visibleOrders.map((order) => [
      order.id, order.created_at, order.customer_name, order.customer_email,
      order.customer_phone, order.address, order.city, order.state, order.pincode,
      order.order_status, order.payment_status, order.payment_provider,
      order.subtotal_paise, order.shipping_paise, order.discount_paise,
      order.total_paise, order.coupon_code, order.tracking_number, order.courier_name,
      (order.order_items ?? []).map((item) => `${item.product_name} x${item.quantity}`).join("; "),
    ])
    const csv = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `timora-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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
            <div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Order management · {role}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/returns" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d4af37]/30 px-3 text-xs text-[#e4c878] hover:bg-[#d4af37]/10">Returns desk</Link>
            <button type="button" onClick={() => void loadOrders()} disabled={loading} className="grid size-10 place-items-center rounded-full border border-white/10 hover:border-[#d4af37]/40 disabled:opacity-50" aria-label="Refresh orders"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
            <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:text-[#e4c878]"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Order management</p><h1 className="mt-2 text-3xl font-medium sm:text-4xl">All Orders</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Showing all orders by default. The summary cards count every order in the database; use the filters to narrow the list. Delete unwanted test orders to remove them from all order views.</p></div>
          <div className="flex flex-wrap gap-2">
            {role === "admin" && <button type="button" onClick={exportVisibleOrders} disabled={visibleOrders.length === 0} className="min-h-10 rounded-full border border-emerald-300/25 px-4 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-40">Export CSV ({visibleOrders.length})</button>}
            {([ ["awaiting","Awaiting review"], ["payment","Unpaid active orders"], ["cod","COD orders"], ["all","All orders"] ] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 rounded-full px-4 text-xs font-medium ${filter === value ? "bg-[#d4af37] text-[#17130c]" : "border border-white/15 text-white/65"}`}>{label}</button>)}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><Clock3 className="size-4 text-[#d4af37]" />Awaiting review</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => o.payment_provider === "cod" && o.order_status === "pending_payment" && o.payment_status === "pending").length}</p></div>
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><PackageCheck className="size-4 text-emerald-300" />Approved</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => Boolean(o.cod_approved_at) && o.order_status !== "cancelled").length}</p></div>
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4"><div className="flex items-center gap-2 text-xs text-white/50"><CreditCard className="size-4 text-amber-200" />Unpaid active orders</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => o.payment_status !== "paid" && o.order_status !== "cancelled").length}</p></div>
          <div className="col-span-2 rounded-xl border border-white/10 bg-[#11110f] p-4 sm:col-span-1"><div className="flex items-center gap-2 text-xs text-white/50"><XCircle className="size-4 text-red-300" />Cancelled</div><p className="mt-3 text-2xl font-semibold">{orders.filter((o) => o.order_status === "cancelled").length}</p></div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] p-4">
            <p className="text-xs text-white/55">{role === "admin" ? "Money collected this month" : "Monthly operations"}</p>
            <p className="mt-2 text-2xl font-semibold text-[#e4c878]">{role === "admin" ? money(collectedThisMonth) : "—"}</p>
            <p className="mt-1 text-[11px] text-white/40">{role === "admin" ? `${paymentsCollectedThisMonth} recorded payment(s) ·` : "Owner-only financial metric ·"} {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4">
            <p className="text-xs text-white/55">Orders placed this month</p>
            <p className="mt-2 text-2xl font-semibold">{ordersPlacedThisMonth}</p>
            <p className="mt-1 text-[11px] text-white/40">Excludes cancelled orders</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4">
            <p className="text-xs text-white/55">Delivered orders</p>
            <p className="mt-2 text-2xl font-semibold">{orders.filter((order) => order.order_status === "delivered").length}</p>
            <p className="mt-1 text-[11px] text-white/40">Across all loaded order history</p>
          </div>
        </div>

        <label className="mt-6 flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-[#11110f] px-4"><Search className="size-4 text-white/40"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order ID, customer, phone, PIN or tracking number" className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" aria-label="Search orders"/></label>

        {error && <div role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#e6d39c]">{notice}</div>}

        <section className="mt-7 space-y-4">
          {loading && orders.length === 0 ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading orders...</p> : visibleOrders.length === 0 ? <div className="rounded-xl border border-white/10 bg-[#11110f] p-10 text-center"><PackageCheck className="mx-auto size-9 text-[#d4af37]/60" /><p className="mt-3 text-sm text-white/70">{filter === "awaiting" ? "No orders match this filter." : "No orders found yet."}</p><p className="mt-1 text-xs text-white/40">Orders from all payment methods appear here after checkout.</p></div> : visibleOrders.map((order) => {
            const awaiting = order.order_status === "pending_payment" && order.payment_status === "pending"
            return <article key={order.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#11110f]">
              <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] ${awaiting ? "bg-amber-300/10 text-amber-200" : order.order_status === "cancelled" ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>{awaiting ? "Awaiting approval" : order.order_status.replaceAll("_", " ")}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/55">{(order.payment_provider || "unknown").replaceAll("_", " ")}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/55">Payment: {order.payment_status}</span></div><p className="mt-2 text-xs text-white/40">Placed {new Date(order.created_at).toLocaleString("en-IN")}</p></div>
                <div className="flex flex-col items-start gap-3 sm:items-end"><div className="text-left sm:text-right"><p className="text-xl font-semibold text-[#e4c878]">{money(order.total_paise)}</p><p className="mt-1 text-xs text-white/45">Subtotal {money(order.subtotal_paise)} · Discount {money(order.discount_paise || 0)} · Shipping {money(order.shipping_paise)}{order.coupon_code ? ` · ${order.coupon_code}` : ""}</p></div><div className="flex flex-wrap items-center gap-2"><InvoiceButton order={order} admin />{role === "admin" && order.payment_status !== "paid" && (order.order_status === "cancelled" || (order.order_status === "pending_payment" && order.payment_status === "pending")) && <button type="button" onClick={() => void deleteOrder(order)} disabled={workingId === order.id} aria-label={`Delete order ${order.id.slice(0, 8)}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-400/30 px-3 text-xs text-red-200 hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="size-4"/>{workingId === order.id ? "Deleting..." : "Delete order"}</button>}</div></div>
              </div>
              <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                <div><h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Customer & delivery</h3><p className="mt-3 text-sm font-medium">{order.customer_name}</p><p className="mt-1 break-all text-xs text-white/60">{order.customer_email}</p><p className="mt-1 text-xs text-white/60">{order.customer_phone}</p><p className="mt-3 text-sm leading-6 text-white/75">{order.address}{order.landmark ? `, ${order.landmark}` : ""}<br />{order.city}, {order.state} — {order.pincode}</p>{order.delivery_note && <p className="mt-2 text-xs text-white/45">Note: {order.delivery_note}</p>}</div>
                <div><h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Items</h3><div className="mt-3 space-y-3">{(order.order_items ?? []).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0"><div><p className="text-sm">{item.product_name}</p>{item.variant && <p className="mt-1 text-xs text-white/40">{item.variant}</p>}<p className="mt-1 text-xs text-white/45">Qty {item.quantity} × {money(item.unit_price_paise)}</p></div><p className="shrink-0 text-sm">{money(item.line_total_paise)}</p></div>)}</div></div>
              </div>
              {(order.tracking_number || order.courier_name || order.cod_collected_at || order.payment_verified_at) && <div className="mx-4 mb-4 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/60 sm:mx-5 sm:grid-cols-2">{order.courier_name && <p>Courier: <span className="text-white/85">{order.courier_name}</span></p>}{order.tracking_number && <p>Tracking: <span className="text-white/85">{order.tracking_number}</span></p>}{order.cod_collected_at && <p className="text-emerald-200">COD collected {new Date(order.cod_collected_at).toLocaleString("en-IN")}</p>}{order.payment_verified_at && <p className="text-emerald-200">Payment verified {new Date(order.payment_verified_at).toLocaleString("en-IN")}</p>}</div>}
              {order.cod_rejection_reason && <p className="mx-4 mb-4 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200 sm:mx-5">Rejection reason: {order.cod_rejection_reason}</p>}
              {order.payment_provider !== "cod" && order.payment_status !== "paid" && order.order_status !== "cancelled" && <div className="flex flex-col gap-3 border-t border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><p className="max-w-xl text-xs leading-5 text-amber-100/70">Only verify payment after confirming the actual bank/provider receipt. This is a manual staff action, not automatic UPI verification.</p><button type="button" disabled={workingId === order.id} onClick={() => { const reference = window.prompt("Enter the UPI/bank transaction reference (UTR) from the verified receipt:"); if (!reference?.trim()) return; if (window.confirm("Have you independently verified the full payment in the bank/provider receipt? This will confirm the order.")) void runStaffRpc("verify_order_payment", { p_order_id: order.id, p_payment_reference: reference.trim().slice(0, 200) }, "Payment marked verified. Order confirmed for processing.") }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-300/30 px-5 text-sm text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50"><CreditCard className="size-4"/>{workingId === order.id ? "Verifying..." : "Mark payment verified"}</button></div>}
              {awaiting && order.payment_provider === "cod" && <div className="flex flex-col gap-3 border-t border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-end sm:p-5">
                {rejectingOrder === order.id ? <div className="w-full space-y-3"><label className="block text-xs text-white/65">Reason for rejection (optional)<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={500} rows={2} placeholder="e.g. Invalid address or unable to deliver" className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 py-2 text-sm outline-none focus:border-[#d4af37]" /></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setRejectingOrder(null); setRejectionReason("") }} className="min-h-10 rounded-full border border-white/15 px-4 text-sm text-white/70">Keep order</button><button type="button" disabled={workingId === order.id} onClick={() => void reviewOrder(order.id, "reject", rejectionReason)} className="min-h-10 rounded-full bg-red-500/15 px-4 text-sm font-medium text-red-200 hover:bg-red-500/25 disabled:opacity-50">{workingId === order.id ? "Rejecting..." : "Confirm rejection"}</button></div></div> : <><button type="button" disabled={workingId === order.id} onClick={() => setRejectingOrder(order.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-400/30 px-5 text-sm text-red-200 hover:bg-red-400/10 disabled:opacity-50"><XCircle className="size-4" />Reject order</button><button type="button" disabled={workingId === order.id} onClick={() => void reviewOrder(order.id, "approve")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] hover:bg-[#e6c85c] disabled:cursor-wait disabled:opacity-50"><CheckCircle2 className="size-4" />{workingId === order.id ? "Approving..." : "Approve COD order"}</button></>}
              </div>}
              {order.order_status !== "pending_payment" && order.order_status !== "cancelled" && <div className="flex flex-col gap-3 border-t border-white/[0.08] p-4 sm:p-5">
                {(order.order_status === "confirmed" || order.order_status === "processing") && <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs text-white/55">Courier (required to ship)<input value={courierName} onChange={(event) => setCourierName(event.target.value)} maxLength={120} placeholder="Courier name" className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label><label className="text-xs text-white/55">Tracking number (required to ship)<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={200} placeholder="Tracking number" className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label><div className="flex items-end"><button type="button" disabled={workingId === order.id || (order.payment_provider === "cod" ? !order.cod_approved_at : order.payment_status !== "paid")} onClick={() => void advanceDelivery(order)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-4 text-xs font-semibold text-[#17130c] disabled:cursor-not-allowed disabled:opacity-40"><Truck className="size-4"/>{order.order_status === "confirmed" ? "Start processing" : "Mark shipped"}</button></div></div>}
                {order.order_status === "shipped" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-white/55">Confirm delivery only after the courier has delivered the package.</p><button type="button" disabled={workingId === order.id} onClick={() => { if (window.confirm("Confirm that this order was delivered?")) void advanceDelivery(order) }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-300/30 px-4 text-sm text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50"><PackageCheck className="size-4"/>Mark delivered</button></div>}
                {order.payment_provider === "cod" && order.order_status === "delivered" && order.payment_status !== "paid" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-amber-100/70">Mark cash collected only after receiving the full COD amount.</p><button type="button" disabled={workingId === order.id} onClick={() => { if (window.confirm("Have you received the full COD payment?")) void runStaffRpc("mark_cod_collected", { p_order_id: order.id }, "COD collection recorded as paid.") }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-300/30 px-4 text-sm text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50"><Banknote className="size-4"/>Record COD collected</button></div>}
              </div>}
            </article>
          })}
        </section>
        <p className="mt-8 text-center text-[11px] leading-5 text-white/35">Timora staff workspace · Delivery and payment status are recorded separately. Only mark payment received after verifying funds.</p>
      </div>
    </main>
  )
}
