import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { products as sampleProducts } from "@/lib/data"

export const runtime = "nodejs"

type PaymentProvider = "upi_qr" | "whatsapp" | "cod" | "razorpay"
type RequestItem = { productId: string; variant?: string; quantity: number }
type DbProduct = {
  id: string
  name: string
  slug: string
  price: number | string
  stock: number
  is_active: boolean
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}
function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
function readableRpcError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes("insufficient stock")) return "Stock changed while you were checking out. Please review the quantity and try again."
  if (text.includes("product options are not configured")) return "This product's selected option is not configured for live ordering. Remove it from your cart and add the live catalogue product again."
  if (text.includes("no longer available") || text.includes("not configured for live ordering")) return "One of the products is not available for live ordering. Please remove it and add the currently listed product again."
  if (text.includes("authentication required") || text.includes("permission denied")) return "Your session expired. Please sign in again."
  if (text.includes("coupon")) return message
  if (text.includes("invalid customer") || text.includes("invalid item") || text.includes("invalid order total")) return "Please check your delivery details and cart, then try again."
  return "We couldn't securely complete the order. No partial order or stock update was kept. Please try again."
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return errorResponse("Please sign in before placing your order.", 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return errorResponse("Invalid order request.") }

    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
      return errorResponse("Your cart must contain between 1 and 50 items.")
    }

    const customerName = cleanText(body.customerName, 120)
    const customerEmail = cleanText(body.customerEmail, 254).toLowerCase()
    const customerPhone = cleanText(body.customerPhone, 20).replace(/\D/g, "")
    const address = cleanText(body.address, 500)
    const landmark = cleanText(body.landmark, 200)
    const city = cleanText(body.city, 100)
    const state = cleanText(body.state, 100)
    const pincode = cleanText(body.pincode, 10)
    const deliveryNote = cleanText(body.deliveryNote, 500)
    const paymentProvider = body.paymentProvider as PaymentProvider

    if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || !/^\d{10}$/.test(customerPhone) || !address || !city || !state || !/^\d{6}$/.test(pincode)) {
      return errorResponse("Please check your name, email, 10-digit phone number, address and 6-digit PIN code.")
    }
    if (!(["upi_qr", "whatsapp", "cod"] as string[]).includes(paymentProvider)) {
      return errorResponse("Please select a valid payment method.")
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
    if (paymentProvider === "razorpay" && (!razorpayKeyId || !razorpayKeySecret)) {
      return errorResponse("Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.", 503)
    }

    const grouped = new Map<string, RequestItem>()
    for (const raw of body.items) {
      if (!raw || typeof raw !== "object") return errorResponse("Your cart contains an invalid item.")
      const item = raw as Record<string, unknown>
      const productId = cleanText(item.productId, 100)
      const quantity = item.quantity
      const variant = cleanText(item.variant, 120) || "Default"
      if (!productId || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return errorResponse("A product or quantity in your cart is invalid.")
      }
      const key = `${productId}::${variant}`
      const existing = grouped.get(key)
      if (existing) {
        existing.quantity += quantity
        if (existing.quantity > 99) return errorResponse("The quantity for an item cannot exceed 99.")
      } else grouped.set(key, { productId, variant, quantity })
    }
    const requested = [...grouped.values()]

    // Legacy sample cards have IDs such as p1. Resolve them by slug to a real database row;
    // never create an order against mock stock or mock prices.
    const sampleSlugs = requested.map((item) => {
      if (UUID_REGEX.test(item.productId)) return null
      return sampleProducts.find((product) => product.id === item.productId)?.slug ?? null
    }).filter((slug): slug is string => Boolean(slug))
    const unknownLegacyIds = requested.filter((item) => !UUID_REGEX.test(item.productId) && !sampleProducts.some((product) => product.id === item.productId))
    if (unknownLegacyIds.length) return errorResponse("A product in your cart could not be found. Remove it and add it again.")

    const ids = [...new Set(requested.filter((item) => UUID_REGEX.test(item.productId)).map((item) => item.productId))]
    const slugs = [...new Set(sampleSlugs)]
    const dbProducts = new Map<string, DbProduct>()

    if (ids.length) {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,price,stock,is_active")
        .in("id", ids)
      if (error) {
        console.error("Order product lookup failed:", error.message)
        return errorResponse("We couldn't verify the live catalogue. Please try again.", 500)
      }
      for (const row of (data ?? []) as DbProduct[]) {
        dbProducts.set(row.id, row)
        dbProducts.set(`slug:${row.slug}`, row)
      }
    }

    if (slugs.length) {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,price,stock,is_active")
        .in("slug", slugs)
      if (error) {
        console.error("Sample listing resolution failed:", error.message)
        return errorResponse("We couldn't verify the live catalogue. Please try again.", 500)
      }
      for (const row of (data ?? []) as DbProduct[]) {
        dbProducts.set(row.id, row)
        dbProducts.set(`slug:${row.slug}`, row)
      }
    }

    const atomicItems: { productId: string; variant: string; quantity: number }[] = []
    for (const item of requested) {
      const variant = item.variant || "Default"
      const sample = UUID_REGEX.test(item.productId) ? undefined : sampleProducts.find((product) => product.id === item.productId)
      const product = UUID_REGEX.test(item.productId) ? dbProducts.get(item.productId) : sample ? dbProducts.get(`slug:${sample.slug}`) : undefined
      if (!product || !UUID_REGEX.test(product.id)) {
        return errorResponse("A product in your cart is a demo listing and is not yet configured for live ordering. Add the active database product before checkout.")
      }
      if (!product.is_active) return errorResponse(`"${product.name}" is no longer available.`)
      if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0 || !Number.isInteger(Number(product.stock)) || product.stock < 0) {
        return errorResponse(`"${product.name}" has invalid catalogue data. Please contact support.`, 500)
      }
      if (variant !== "Default") {
        return errorResponse(`Product options for "${product.name}" are not configured for live ordering yet. Please remove it and add the current catalogue listing again.`)
      }
      atomicItems.push({ productId: product.id, variant, quantity: item.quantity })
    }

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_address: address,
      p_landmark: landmark || null,
      p_city: city,
      p_state: state,
      p_pincode: pincode,
      p_delivery_note: deliveryNote || null,
      p_payment_provider: paymentProvider,
      p_items: atomicItems,
      p_coupon_code: cleanText(body.couponCode, 40).toUpperCase() || null,
    })

    if (error) {
      console.error("Atomic order creation failed:", error.message)
      return errorResponse(readableRpcError(error.message), error.message.toLowerCase().includes("authentication") ? 401 : 400)
    }
    const result = Array.isArray(data) ? data[0] : data
    if (!result?.order_id) {
      console.error("Atomic order RPC returned no order ID")
      return errorResponse("The order service returned an incomplete response. Please contact support before retrying.", 500)
    }


    let razorpay: { keyId: string; orderId: string; amount: number; currency: "INR" } | undefined
    if (paymentProvider === "razorpay") {
      const amount = Number(result.total_paise)
      let gatewayOrder: { id?: string; amount?: number; currency?: string }
      try {
        const gatewayResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            currency: "INR",
            receipt: String(result.order_id),
            notes: { timora_order_id: String(result.order_id) },
          }),
          cache: "no-store",
        })
        gatewayOrder = await gatewayResponse.json().catch(() => ({}))
        if (!gatewayResponse.ok || !gatewayOrder.id || gatewayOrder.amount !== amount || gatewayOrder.currency !== "INR") {
          console.error("Razorpay order creation failed:", gatewayOrder)
          await supabase.rpc("cancel_my_pending_order", { p_order_id: result.order_id })
          return errorResponse("Razorpay could not start this payment. Your pending order was cancelled; please try again.", 502)
        }
      } catch (gatewayError) {
        console.error("Razorpay order request failed:", gatewayError)
        await supabase.rpc("cancel_my_pending_order", { p_order_id: result.order_id })
        return errorResponse("Razorpay is temporarily unavailable. Your pending order was cancelled; please try again.", 502)
      }

      const { error: referenceError } = await supabase.rpc("set_razorpay_order_reference", {
        p_order_id: result.order_id,
        p_razorpay_order_id: gatewayOrder.id,
      })
      if (referenceError) {
        console.error("Could not bind Razorpay order:", referenceError.message)
        await supabase.rpc("cancel_my_pending_order", { p_order_id: result.order_id })
        return errorResponse("We couldn't securely link the payment to your order. Please try again.", 500)
      }
      razorpay = { keyId: razorpayKeyId!, orderId: gatewayOrder.id, amount, currency: "INR" }
    }

    return NextResponse.json({
      success: true,
      orderId: result.order_id,
      message: paymentProvider === "cod"
        ? "COD order created and awaiting staff approval. Payment has not been collected."
        : paymentProvider === "razorpay"
          ? "Order created. Complete payment securely with Razorpay."
          : "Order created with payment pending. Payment has not been verified and the order must not be dispatched yet.",
      orderStatus: "pending_payment",
      paymentStatus: "pending",
      subtotalPaise: Number(result.subtotal_paise),
      shippingPaise: Number(result.shipping_paise),
      discountPaise: Number(result.discount_paise ?? 0),
      totalPaise: Number(result.total_paise),
      ...(razorpay ? { razorpay } : {}),
    }, { status: 201 })
  } catch (error) {
    console.error("Unexpected order API error:", error)
    return errorResponse("An unexpected error occurred. Please try again.", 500)
  }
}
