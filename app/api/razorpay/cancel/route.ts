import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const { data, error } = await supabase.rpc("cancel_my_pending_order", { p_order_id: orderId })
    if (error || !data?.success) {
      // A payment may have completed just as the checkout was dismissed; do not claim it was cancelled.
      return NextResponse.json({ error: "The pending order could not be cancelled automatically. Check Orders before trying again." }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Razorpay order cancellation failed:", error)
    return NextResponse.json({ error: "Could not cancel the pending order." }, { status: 500 })
  }
}
