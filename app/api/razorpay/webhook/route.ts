import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

type Entity = {
  id?: string
  order_id?: string
  amount?: number
  currency?: string
  status?: string
  notes?: Record<string, string>
}
type RazorpayWebhookBody = {
  event?: string
  payload?: {
    payment?: { entity?: Entity }
    order?: { entity?: Entity }
  }
}

export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!secret || !supabaseUrl || !serviceKey) {
      console.error("Razorpay webhook requires webhook secret and server-only Supabase key.")
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 })
    }

    const rawBody = await request.text()
    const signature = request.headers.get("x-razorpay-signature") || ""
    if (!/^[0-9a-f]{64}$/i.test(signature)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
    const expectedBuffer = Buffer.from(expected, "hex")
    const receivedBuffer = Buffer.from(signature, "hex")
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 })
    }

    let body: RazorpayWebhookBody
    try { body = JSON.parse(rawBody) as RazorpayWebhookBody } catch { return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 }) }
    if (!["payment.captured", "order.paid"].includes(body.event || "")) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const payment = body.payload?.payment?.entity
    const gatewayOrderId = payment?.order_id || body.payload?.order?.entity?.id
    const paymentId = payment?.id
    if (!gatewayOrderId || !paymentId || payment?.status !== "captured" || payment.currency !== "INR" || !Number.isFinite(payment.amount)) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,total_paise,payment_reference,payment_status,order_status")
      .eq("payment_provider", "razorpay")
      .eq("payment_reference", gatewayOrderId)
      .maybeSingle()
    if (orderError) {
      console.error("Razorpay webhook order lookup failed:", orderError.message)
      return NextResponse.json({ error: "Order lookup failed." }, { status: 500 })
    }
    // A successful browser callback may already have finalized this payment. Replays are harmless.
    if (!order) return NextResponse.json({ received: true, ignored: true })
    if (Number(order.total_paise) !== payment.amount) {
      console.error("Razorpay webhook amount mismatch:", { orderId: order.id, gatewayOrderId })
      return NextResponse.json({ error: "Payment amount does not match the Timora order." }, { status: 400 })
    }
    if (order.payment_status === "paid" && order.order_status === "confirmed") return NextResponse.json({ received: true, alreadyProcessed: true })

    const { data: finalized, error: finalizeError } = await admin.rpc("verify_razorpay_order_payment", {
      p_order_id: order.id,
      p_razorpay_order_id: gatewayOrderId,
      p_payment_id: paymentId,
    })
    if (finalizeError || !finalized?.success) {
      console.error("Razorpay webhook could not finalize order:", finalizeError?.message || "Finalization RPC returned success=false")
      // Return a non-2xx response so Razorpay retries delivery instead of treating
      // an unfinalized paid order as successfully handled.
      return NextResponse.json({ error: "Order finalization failed." }, { status: 500 })
    }
    return NextResponse.json({ received: true, success: true })
  } catch (error) {
    console.error("Razorpay webhook failed:", error)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}
