"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock3,
  MapPin,
  CreditCard,
  AlertCircle,
} from "lucide-react"
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

type CustomerOrder = {
  id: string
  customer_id: string
  customer_name: string
  address: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  subtotal_paise: number
  shipping_paise: number
  discount_paise: number
  coupon_code: string | null
  total_paise: number
  order_status: string
  payment_status: string
  payment_provider: string | null
  payment_verified_at?: string | null
  cod_collected_at?: string | null
  tracking_number: string | null
  courier_name: string | null
  shipped_at: string | null
  delivered_at: string | null
  cod_rejection_reason: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

const formatPrice = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100)

const formatDate = (value: string | null) => {
  if (!value) return "Not yet"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
}

const stages = [
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
]

function StatusTimeline({ order }: { order: CustomerOrder }) {
  const cancelled = order.order_status === "cancelled"
  const waiting = order.order_status === "pending_payment"
  const currentIndex = stages.findIndex((stage) => stage.status === order.order_status)

  if (cancelled) {
    return (
      <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-4">
        <p className="font-medium text-red-300">Order cancelled</p>
        {order.cod_rejection_reason && (
          <p className="mt-1 text-sm text-white/60">Reason: {order.cod_rejection_reason}</p>
        )}
      </div>
    )
  }

  if (waiting) {
    const isCod = order.payment_provider === "cod"
    return (
      <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4">
        <p className="font-medium text-amber-200">{isCod ? "Awaiting COD approval" : "Payment pending"}</p>
        <p className="mt-1 text-sm text-white/55">
          {isCod
            ? "Your COD request has been received. Timora staff must approve it before processing or dispatch."
            : "Your order is saved, but payment has not been verified. The order will not be dispatched until payment is confirmed."}
        </p>
      </div>
    )
  }

  return (
    <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stages.map((stage, index) => {
        const complete = currentIndex >= index
        const active = currentIndex === index
        return (
          <li
            key={stage.status}
            className={`rounded-xl border p-3 ${
              complete
                ? "border-[#d4af37]/35 bg-[#d4af37]/[0.07]"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              {complete ? (
                <CheckCircle2 className="size-4 shrink-0 text-[#d4af37]" />
              ) : (
                <Clock3 className="size-4 shrink-0 text-white/30" />
              )}
              <span className={`text-sm ${active ? "font-semibold text-[#e4c878]" : complete ? "text-white/85" : "text-white/40"}`}>
                {stage.label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userName, setUserName] = useState("")
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.replace("/login?next=%2Forders")
        return
      }

      setUserName(user.user_metadata?.full_name || user.email || "Customer")

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id,customer_id,customer_name,address,landmark,city,state,pincode,subtotal_paise,shipping_paise,discount_paise,coupon_code,total_paise,order_status,payment_status,payment_provider,payment_verified_at,cod_collected_at,tracking_number,courier_name,shipped_at,delivered_at,cod_rejection_reason,created_at,updated_at",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError

      const rows = (data ?? []) as CustomerOrder[]
      if (rows.length === 0) {
        setOrders([])
        return
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from("order_items")
        .select("id,order_id,product_name,product_slug,quantity,unit_price_paise,line_total_paise,variant")
        .in("order_id", rows.map((order) => order.id))

      if (itemsError) throw itemsError

      const items = (itemRows ?? []) as OrderItem[]
      setOrders(
        rows.map((order) => ({
          ...order,
          order_items: items.filter((item) => item.order_id === order.id),
        })),
      )

      // Best-effort conversion attribution: never let analytics failures affect order history.
      // The click identifier is session-scoped until a consent-aware persistent attribution flow is added.
      try {
        const rawClick = sessionStorage.getItem("timora_last_ad_click")
        const click = rawClick ? JSON.parse(rawClick) as {
          campaignId?: string
          clickId?: string
          placement?: string
          productId?: string | null
          at?: number
        } : null
        const validClick = click
          && typeof click.campaignId === "string"
          && typeof click.clickId === "string"
          && typeof click.placement === "string"
          && typeof click.at === "number"
          && click.at <= Date.now()
          && Date.now() - click.at <= 30 * 24 * 60 * 60 * 1000
        if (validClick && click && click.campaignId && click.clickId && click.placement && typeof click.at === "number") {
          const attributedOrders = rows.filter((order) =>
            new Date(order.created_at).getTime() >= click.at
            && order.payment_status === "paid"
            && order.order_status !== "cancelled"
            && (order.payment_provider === "cod" ? Boolean(order.cod_collected_at) : Boolean(order.payment_verified_at))
          ).slice(0, 50)
          await Promise.all(attributedOrders.map((order) => supabase.rpc("record_ad_event", {
            p_event_key: crypto.randomUUID(),
            p_campaign_id: click.campaignId,
            p_event_type: "purchase",
            p_placement: click.placement,
            p_product_id: click.productId ?? null,
            p_order_id: order.id,
            p_click_id: click.clickId,
            p_session_key: sessionStorage.getItem("timora_ad_session"),
          })))
        }
      } catch {
        // Attribution is optional; order history must remain available if storage or analytics fails.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your orders.")
    } finally {
      setLoading(false)
    }
  }, [router])

  async function cancelPendingOrder(orderId: string) {
    if (!window.confirm("Cancel this unpaid pending order? Its stock reservation will be released.")) return
    setCancellingId(orderId)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("cancel_my_pending_order", { p_order_id: orderId })
      if (rpcError) throw rpcError
      setNotice("Order cancelled. Its stock reservation has been released.")
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel this order.")
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]">
      <header className="border-b border-[#d4af37]/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/65 transition hover:text-[#e4c878]">
            <ArrowLeft className="size-4" />
            Continue shopping
          </Link>
          <p className="text-lg font-semibold tracking-[0.18em]">
            TIMORA<span className="text-[#d4af37]">.</span>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
              Your account
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">My Orders</h1>
            <p className="mt-2 text-sm text-white/55">Hello {userName}, follow your order and delivery progress here.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-white/15 px-4 text-sm text-white/75 transition hover:border-[#d4af37]/40 hover:text-[#e4c878] disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh orders
          </button>
        </div>

        {notice && <div role="status" className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200">{notice}</div>}

        {error && (
          <div role="alert" className="mt-6 flex gap-2 rounded-xl border border-red-400/25 bg-red-400/5 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Could not load orders: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#11110f] p-10 text-center text-sm text-white/55">
            Loading your orders…
          </div>
        ) : orders.length === 0 && !error ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#11110f] px-6 py-14 text-center">
            <Package className="mx-auto size-10 text-[#d4af37]/70" />
            <h2 className="mt-4 text-lg font-medium">No orders yet</h2>
            <p className="mt-2 text-sm text-white/50">Your orders will appear here after you place one.</p>
            <Link href="/products" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#d4af37] px-6 text-sm font-semibold text-[#17130c] hover:bg-[#e6c85c]">
              Explore products
            </Link>
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            {orders.map((order) => {
              const statusLabel = order.order_status.replaceAll("_", " ")
              const paymentLabel = order.payment_status.replaceAll("_", " ")
              return (
                <article key={order.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#11110f]">
                  <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <p className="text-xs text-white/45">Order ID</p>
                      <p className="mt-1 break-all font-mono text-sm text-white/85">{order.id}</p>
                      <p className="mt-2 text-xs text-white/45">Placed {formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <InvoiceButton order={order} />
                      <Link href={`/orders/${order.id}`} className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 px-3 text-xs text-white/70 transition hover:border-[#d4af37]/40 hover:text-[#e4c878]">Order details</Link>
                      <span className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-3 py-1.5 text-xs capitalize text-[#e4c878]">
                        {statusLabel}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs capitalize text-white/65">
                        Payment: {paymentLabel}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <StatusTimeline order={order} />

                    {(order.order_status === "shipped" || order.order_status === "delivered" || order.tracking_number || order.courier_name) && (
                      <div className="mt-5 grid gap-3 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.04] p-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <Truck className="mt-0.5 size-5 text-[#d4af37]" />
                          <div>
                            <p className="text-xs text-white/45">Courier</p>
                            <p className="mt-1 text-sm">{order.courier_name || "Not provided yet"}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-white/45">Tracking number</p>
                          <p className="mt-1 break-all font-mono text-sm">{order.tracking_number || "Not provided yet"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/45">Shipped</p>
                          <p className="mt-1 text-sm">{formatDate(order.shipped_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/45">Delivered</p>
                          <p className="mt-1 text-sm">{formatDate(order.delivered_at)}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
                      <div>
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                          <Package className="size-4 text-[#d4af37]" />
                          Items ordered
                        </h2>
                        <div className="mt-3 space-y-3">
                          {(order.order_items ?? []).map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-0">
                              <div className="min-w-0">
                                <p className="text-sm text-white/85">{item.product_name}</p>
                                <p className="mt-1 text-xs text-white/45">
                                  Qty {item.quantity}{item.variant && item.variant !== "Default" ? ` · ${item.variant}` : ""}
                                </p>
                                {order.order_status === "delivered" && order.payment_status === "paid" && item.product_slug ? (
                                  <Link
                                    href={`/product/${encodeURIComponent(item.product_slug)}#reviews-heading`}
                                    className="mt-2 inline-flex min-h-8 items-center rounded-full border border-[#c9a96e]/40 px-3 text-xs font-medium text-[#dfc797] transition hover:bg-[#c9a96e]/10"
                                  >
                                    Write a review
                                  </Link>
                                ) : order.order_status !== "cancelled" && item.product_slug ? (
                                  <p className="mt-2 text-[11px] text-white/40">Review available after delivery and payment confirmation.</p>
                                ) : null}
                              </div>
                              <p className="shrink-0 text-sm">{formatPrice(item.line_total_paise)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <aside className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                          <CreditCard className="size-4 text-[#d4af37]" />
                          Payment summary
                        </h2>
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between gap-3 text-white/55">
                            <span>Subtotal</span><span>{formatPrice(order.subtotal_paise)}</span>
                          </div>
                          {order.discount_paise > 0 && <div className="flex justify-between gap-3 text-emerald-200"><span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span><span>−{formatPrice(order.discount_paise)}</span></div>}
                          <div className="flex justify-between gap-3 text-white/55">
                            <span>Shipping</span><span>{formatPrice(order.shipping_paise)}</span>
                          </div>
                          <div className="flex justify-between gap-3 border-t border-white/10 pt-3 font-semibold">
                            <span>Total</span><span className="text-[#e4c878]">{formatPrice(order.total_paise)}</span>
                          </div>
                          <p className="pt-1 text-xs capitalize text-white/45">
                            Method: {order.payment_provider === "cod" ? "Cash on delivery" : order.payment_provider === "upi_qr" ? "UPI QR" : order.payment_provider || "Not available"}
                          </p>
                        </div>
                      </aside>
                    </div>

                    {order.order_status === "pending_payment" && order.payment_status === "pending" && <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-white/60">This order is still pending. You may cancel it if you no longer want to proceed.</p><button type="button" disabled={cancellingId === order.id} onClick={() => void cancelPendingOrder(order.id)} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-red-300/25 px-4 text-sm text-red-200 hover:bg-red-300/10 disabled:opacity-50">{cancellingId === order.id ? "Cancelling…" : "Cancel pending order"}</button></div>}

                    <div className="mt-5 rounded-xl border border-white/[0.07] p-4">
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="size-4 text-[#d4af37]" />
                        Delivery address
                      </h2>
                      <p className="mt-2 text-sm text-white/75">{order.address}{order.landmark ? `, ${order.landmark}` : ""}</p>
                      <p className="mt-1 text-sm text-white/50">{order.city}, {order.state} {order.pincode}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
