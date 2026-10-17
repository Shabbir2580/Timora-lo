"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Package, RefreshCw, Truck, CreditCard, RotateCcw, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Item = { id: string; product_name: string; product_slug: string; quantity: number; unit_price_paise: number; line_total_paise: number; variant: string | null }
type Order = {
  id: string; customer_id: string; customer_name: string; address: string; landmark: string | null; city: string; state: string; pincode: string
  subtotal_paise: number; shipping_paise: number; discount_paise: number; coupon_code: string | null; total_paise: number
  order_status: string; payment_status: string; payment_provider: string | null; tracking_number: string | null; courier_name: string | null
  shipped_at: string | null; delivered_at: string | null; cod_rejection_reason: string | null; created_at: string; updated_at: string
}
type ReturnRequest = { id: string; status: string; reason: string; created_at: string }

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100)
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Pending"

const stages = [
  { key: "confirmed", label: "Order confirmed", description: "Your order has been accepted." },
  { key: "processing", label: "Preparing your order", description: "Timora is preparing the items." },
  { key: "shipped", label: "Shipped", description: "Your package has been handed to the courier." },
  { key: "delivered", label: "Delivered", description: "Your package has been delivered." },
]

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = params.id
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.replace(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`); return }
      const { data, error: orderError } = await supabase.from("orders")
        .select("id,customer_id,customer_name,address,landmark,city,state,pincode,subtotal_paise,shipping_paise,discount_paise,coupon_code,total_paise,order_status,payment_status,payment_provider,tracking_number,courier_name,shipped_at,delivered_at,cod_rejection_reason,created_at,updated_at")
        .eq("id", orderId).eq("customer_id", user.id).maybeSingle()
      if (orderError) throw orderError
      if (!data) { setOrder(null); setError("We couldn't find this order in your account."); return }
      setOrder(data as Order)
      const [itemsResult, returnResult] = await Promise.all([
        supabase.from("order_items").select("id,product_name,product_slug,quantity,unit_price_paise,line_total_paise,variant").eq("order_id", orderId),
        supabase.from("return_requests").select("id,status,reason,created_at").eq("order_id", orderId).maybeSingle(),
      ])
      if (itemsResult.error) throw itemsResult.error
      setItems((itemsResult.data ?? []) as Item[])
      if (returnResult.error && !returnResult.error.message.toLowerCase().includes("does not exist")) {
        // Return request schema may not be installed yet; order details still work.
        setReturnRequest(null)
      } else setReturnRequest((returnResult.data ?? null) as ReturnRequest | null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load order details.")
    } finally { setLoading(false) }
  }, [orderId, router])

  useEffect(() => { void load() }, [load])

  async function cancelOrder() {
    if (!window.confirm("Cancel this unpaid pending order? Its stock reservation will be released.")) return
    setCancelling(true); setError(""); setNotice("")
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("cancel_my_pending_order", { p_order_id: orderId })
      if (rpcError) throw rpcError
      setNotice("Your pending order has been cancelled.")
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Could not cancel this order.") }
    finally { setCancelling(false) }
  }

  const currentIndex = stages.findIndex(s => s.key === order?.order_status)
  const canRequestReturn = order?.order_status === "delivered" && Boolean(order.delivered_at)

  return <main className="min-h-screen bg-[#0b0b0a] px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-4xl">
      <Link href="/orders" className="inline-flex min-h-10 items-center gap-2 text-sm text-white/60 hover:text-[#e3ca96]"><ArrowLeft className="size-4"/> Back to my orders</Link>
      <header className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a96e]">Order details</p><h1 className="mt-2 text-3xl font-semibold">Your order</h1><p className="mt-2 break-all font-mono text-xs text-white/45">{orderId}</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-white/15 px-4 text-sm text-white/70 disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`}/>Refresh</button>
      </header>
      {error && <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200"><AlertCircle className="size-4 shrink-0"/>{error}</div>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200">{notice}</p>}
      {loading ? <div className="mt-6 rounded-2xl border border-white/10 p-10 text-center text-sm text-white/50">Loading order…</div> : order && <>
        <section className="mt-6 rounded-2xl border border-[#c9a96e]/25 bg-gradient-to-br from-[#201c13] to-[#11110f] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-white/45">Order placed</p><p className="mt-1 text-sm">{dateTime(order.created_at)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs capitalize ${order.order_status === "cancelled" ? "bg-red-300/10 text-red-200" : order.order_status === "delivered" ? "bg-emerald-300/10 text-emerald-200" : "bg-[#c9a96e]/10 text-[#e3ca96]"}`}>{order.order_status.replace(/_/g, " ")}</span></div>
          {order.order_status === "cancelled" ? <p className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">This order was cancelled. {order.cod_rejection_reason ? `Reason: ${order.cod_rejection_reason}` : ""}</p> : order.order_status === "pending_payment" ? <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{order.payment_provider === "cod" ? "Your cash-on-delivery request is awaiting staff approval." : "Payment is pending verification. Dispatch will wait until payment is confirmed."}</p> : <ol className="mt-6 space-y-4">{stages.map((stage, index) => {
            const complete = currentIndex >= index
            const timestamp = stage.key === "shipped" ? order.shipped_at : stage.key === "delivered" ? order.delivered_at : null
            return <li key={stage.key} className="flex gap-3"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border ${complete ? "border-[#c9a96e]/50 bg-[#c9a96e]/15 text-[#e3ca96]" : "border-white/10 text-white/25"}`}>{complete ? <CheckCircle2 className="size-4"/> : <Clock3 className="size-4"/>}</span><div className="flex-1 border-b border-white/[0.07] pb-4"><div className="flex flex-wrap justify-between gap-2"><p className={`text-sm ${complete ? "text-white" : "text-white/40"}`}>{stage.label}</p>{timestamp && <time className="text-xs text-white/40">{dateTime(timestamp)}</time>}</div><p className="mt-1 text-xs text-white/40">{stage.description}</p></div></li>
          })}</ol>}
          {(order.courier_name || order.tracking_number) && <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2"><div className="flex items-start gap-3"><Truck className="size-5 text-[#c9a96e]"/><div><p className="text-xs text-white/40">Courier</p><p className="mt-1 text-sm">{order.courier_name || "Not provided"}</p></div></div><div><p className="text-xs text-white/40">Tracking number</p><p className="mt-1 break-all font-mono text-sm">{order.tracking_number || "Not provided"}</p></div></div>}
        </section>
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><h2 className="flex items-center gap-2 font-semibold"><Package className="size-4 text-[#c9a96e]"/> Items</h2><div className="mt-4 divide-y divide-white/10">{items.map(item=><div key={item.id} className="flex justify-between gap-4 py-4"><div className="min-w-0"><p className="text-sm">{item.product_name}</p><p className="mt-1 text-xs text-white/40">Qty {item.quantity}{item.variant && item.variant !== "Default" ? ` · ${item.variant}` : ""}</p></div><p className="shrink-0 text-sm">{money(item.line_total_paise)}</p></div>)}</div><div className="mt-3 space-y-2 border-t border-white/10 pt-4 text-sm"><div className="flex justify-between text-white/55"><span>Subtotal</span><span>{money(order.subtotal_paise)}</span></div>{order.discount_paise > 0 && <div className="flex justify-between text-emerald-200"><span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span><span>−{money(order.discount_paise)}</span></div>}<div className="flex justify-between text-white/55"><span>Shipping</span><span>{money(order.shipping_paise)}</span></div><div className="flex justify-between border-t border-white/10 pt-3 font-semibold"><span>Total</span><span className="text-[#e3ca96]">{money(order.total_paise)}</span></div><p className="pt-1 text-xs capitalize text-white/40"><CreditCard className="mr-1 inline size-3"/>{order.payment_provider === "cod" ? "Cash on delivery" : order.payment_provider === "razorpay" ? "Razorpay" : order.payment_provider === "upi_qr" ? "UPI QR" : order.payment_provider === "whatsapp" ? "WhatsApp" : order.payment_provider || "Payment method unavailable"} · Payment: {order.payment_status}</p></div></section>
        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-[#c9a96e]"/> Delivery address</h2><p className="mt-3 text-sm">{order.customer_name}</p><p className="mt-1 text-sm leading-6 text-white/60">{order.address}{order.landmark ? `, ${order.landmark}` : ""}<br/>{order.city}, {order.state} {order.pincode}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold"><RotateCcw className="size-4 text-[#c9a96e]"/> Return or cancel</h2>{returnRequest ? <p className="mt-3 text-sm text-white/65">Return request: <span className="capitalize text-[#e3ca96]">{returnRequest.status.replace(/_/g, " ")}</span><br/><span className="mt-1 block text-xs text-white/40">Submitted {dateTime(returnRequest.created_at)}</span></p> : canRequestReturn ? <><p className="mt-2 text-sm leading-6 text-white/50">You can submit a return request for Timora support to review against the published store policy.</p><Link href={`/returns?orderId=${encodeURIComponent(order.id)}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-[#c9a96e] px-4 text-sm font-semibold text-[#17130c]">Request a return</Link></> : <p className="mt-2 text-sm text-white/45">Return requests are available for delivered orders. Contact customer care if you need help with eligibility.</p>}
          {order.order_status === "pending_payment" && order.payment_status === "pending" && <button onClick={() => void cancelOrder()} disabled={cancelling} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-red-300/25 px-4 text-sm text-red-200 disabled:opacity-50">{cancelling ? "Cancelling…" : "Cancel unpaid order"}</button>}
          <Link href="/returns" className="mt-3 inline-flex min-h-10 items-center text-xs text-white/50 hover:text-[#e3ca96]">Returns & customer care</Link></div>
        </section>
      </>}
    </div>
  </main>
}
