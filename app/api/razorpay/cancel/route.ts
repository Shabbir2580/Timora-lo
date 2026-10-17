import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid cancellation request." }, { status: 400 }) }
    const orderId = typeof body.orderId === "string" ? body.orderId : ""
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order reference." }, { status: 400 })
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,payment_provider,payment_reference,payment_status,order_status")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .maybeSingle()
    if (orderError || !order) return NextResponse.json({ error: "Pending order not found." }, { status: 404 })
    if (order.payment_provider !== "razorpay" || order.payment_status !== "pending" || order.order_status !== "pending_payment" || !order.payment_reference?.startsWith("order_")) {
      return NextResponse.json({ error: "This is not a cancellable pending Razorpay order." }, { status: 409 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!keyId || !keySecret || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Payment cancellation is not configured; the order was left pending for safety." }, { status: 503 })
    }

    const gatewayResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(order.payment_reference)}/payments`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      cache: "no-store",
    })
    const gatewayResult = await gatewayResponse.json().catch(() => ({})) as { items?: { status?: string }[] }
    if (!gatewayResponse.ok || !Array.isArray(gatewayResult.items)) {
      return NextResponse.json({ error: "Razorpay payment status could not be checked. The order was left pending for safety." }, { status: 503 })
    }
    if (gatewayResult.items.some((payment) => payment.status !== "failed")) {
      return NextResponse.json({ error: "A Razorpay payment attempt is still active or may have succeeded. The order was left pending; please wait for confirmation or contact support." }, { status: 409 })
    }

    const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await admin.rpc("cancel_unpaid_razorpay_order", {
      p_order_id: orderId,
      p_razorpay_order_id: order.payment_reference,
    })
    if (error || !data?.success) {
      return NextResponse.json({ error: "The pending order could not be cancelled automatically. Check Orders before trying again." }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Razorpay order cancellation failed:", error)
    return NextResponse.json({ error: "Could not cancel the pending order." }, { status: 500 })
  }
}
