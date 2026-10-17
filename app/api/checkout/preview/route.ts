import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { products as sampleProducts } from "@/lib/data"

export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Please sign in to verify a coupon." }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid coupon request." }, { status: 400 }) }

    const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase().slice(0, 40) : ""
    if (!/^[A-Z0-9_-]{3,40}$/.test(couponCode)) return NextResponse.json({ error: "Enter a valid coupon code first." }, { status: 400 })
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return NextResponse.json({ error: "Your cart must contain between 1 and 50 items." }, { status: 400 })

    const requested: { productId: string; variant: string; quantity: number; slug?: string }[] = []
    for (const raw of body.items) {
      if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Your cart contains an invalid item." }, { status: 400 })
      const item = raw as Record<string, unknown>
      const id = typeof item.productId === "string" ? item.productId.trim() : ""
      const quantity = item.quantity
      const variant = typeof item.variant === "string" && item.variant.trim() ? item.variant.trim() : "Default"
      if (!id || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return NextResponse.json({ error: "A product or quantity in your cart is invalid." }, { status: 400 })
      if (variant !== "Default") return NextResponse.json({ error: "This product option is not configured for live ordering yet." }, { status: 400 })
      if (UUID_REGEX.test(id)) requested.push({ productId: id, variant, quantity })
      else {
        const sample = sampleProducts.find((product) => product.id === id)
        if (!sample) return NextResponse.json({ error: "A product in your cart could not be found. Remove it and add it again." }, { status: 400 })
        requested.push({ productId: id, variant, quantity, slug: sample.slug })
      }
    }

    const ids = [...new Set(requested.filter((item) => UUID_REGEX.test(item.productId)).map((item) => item.productId))]
    const slugs = [...new Set(requested.flatMap((item) => item.slug ? [item.slug] : []))]
    const productsById = new Map<string, { id: string; slug: string }>()
    if (ids.length) {
      const { data, error } = await supabase.from("products").select("id,slug").in("id", ids)
      if (error) throw error
      for (const product of data ?? []) productsById.set(product.id, product)
    }
    if (slugs.length) {
      const { data, error } = await supabase.from("products").select("id,slug").in("slug", slugs)
      if (error) throw error
      for (const product of data ?? []) productsById.set(`legacy:${product.slug}`, product)
    }

    const canonicalItems: { productId: string; variant: string; quantity: number }[] = []
    for (const item of requested) {
      const product = item.slug ? productsById.get(`legacy:${item.slug}`) : productsById.get(item.productId)
      if (!product) return NextResponse.json({ error: "A product in your cart is not available in the live catalogue." }, { status: 400 })
      canonicalItems.push({ productId: product.id, variant: item.variant, quantity: item.quantity })
    }

    const { data, error } = await supabase.rpc("preview_checkout_totals", { p_items: canonicalItems, p_coupon_code: couponCode })
    if (error) return NextResponse.json({ error: error.message || "This coupon could not be verified." }, { status: 400 })
    const result = Array.isArray(data) ? data[0] : data
    if (!result) return NextResponse.json({ error: "The coupon service returned no result. Please try again." }, { status: 500 })

    return NextResponse.json({
      valid: true,
      couponCode: result.coupon_code,
      subtotalPaise: Number(result.subtotal_paise),
      shippingPaise: Number(result.shipping_paise),
      discountPaise: Number(result.discount_paise),
      totalPaise: Number(result.total_paise),
      message: Number(result.discount_paise) > 0 ? "Coupon verified and discount applied." : "Coupon verified. No discount is due for this code.",
    })
  } catch (error) {
    console.error("Coupon preview failed:", error)
    return NextResponse.json({ error: "We couldn't verify this coupon right now. Please try again." }, { status: 500 })
  }
}
