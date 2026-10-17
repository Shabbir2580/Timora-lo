import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

type RazorpayPayment = {
  id?: string
  order_id?: string
  amount?: number
  currency?: string
  status?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Please sign in again to verify payment." }, { status: 401 })

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 503 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 }) }
    const orderId = typeof body.orderId === "string" ? body.orderId : ""
    const razorpayOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : ""
    const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : ""
    const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : ""
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !razorpayOrderId.startsWith("order_") || !paymentId.startsWith("pay_") || !/^[0-9a-f]{64}$/i.test(signature)) {
      return NextResponse.json({ error: "Razorpay returned incomplete payment details." }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,total_paise,payment_reference,payment_provider,payment_status,order_status")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .maybeSingle()
    if (orderError || !order) return NextResponse.json({ error: "We couldn't find your order." }, { status: 404 })
    if (order.payment_provider === "razorpay" && order.payment_status === "paid" && order.order_status === "confirmed" && order.payment_reference === paymentId) {
      return NextResponse.json({ success: true, orderId, paymentStatus: "paid", message: "Payment was already verified successfully." })
    }
    if (order.payment_provider !== "razorpay" || order.payment_status !== "pending" || order.order_status !== "pending_payment" || order.payment_reference !== razorpayOrderId) {
      return NextResponse.json({ error: "This payment does not match an awaiting Razorpay order." }, { status: 409 })
    }

    const expectedSignature = createHmac("sha256", keySecret).update(`${razorpayOrderId}|${paymentId}`).digest("hex")
    const expectedBuffer = Buffer.from(expectedSignature, "hex")
    const receivedBuffer = Buffer.from(signature, "hex")
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return NextResponse.json({ error: "Razorpay payment signature could not be verified." }, { status: 400 })
    }

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      cache: "no-store",
    })
    const payment = await paymentResponse.json().catch(() => ({})) as RazorpayPayment
    if (!paymentResponse.ok || payment.id !== paymentId || payment.order_id !== razorpayOrderId || payment.amount !== Number(order.total_paise) || payment.currency !== "INR") {
      console.error("Razorpay payment details do not match Timora order", { orderId, paymentId, status: payment.status })
      return NextResponse.json({ error: "Payment details do not match this order. Please contact Timora support before retrying." }, { status: 400 })
    }
    if (payment.status !== "captured") {
      return NextResponse.json({ error: "Razorpay has not confirmed a captured payment yet. Your order remains pending until capture is confirmed." }, { status: 409 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error("Razorpay verification requires a server-only Supabase service/secret key.")
      return NextResponse.json({ error: "Payment was received, but secure order confirmation is not configured. Contact Timora support with your order reference." }, { status: 503 })
    }
    const adminSupabase = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data: verified, error: verifyError } = await adminSupabase.rpc("verify_razorpay_order_payment", {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId,
      p_payment_id: paymentId,
    })
    if (verifyError || !verified?.success) {
      console.error("Razorpay payment finalization failed:", verifyError?.message)
      return NextResponse.json({ error: "Payment was received, but Timora could not finalize the order automatically. Contact support with your order reference." }, { status: 500 })
    }

    return NextResponse.json({ success: true, orderId, paymentStatus: "paid", message: "Payment verified successfully. Your order is confirmed." })
  } catch (error) {
    console.error("Razorpay payment verification failed:", error)
    return NextResponse.json({ error: "We couldn't verify the payment right now. Please contact support if money was deducted." }, { status: 500 })
  }
}
