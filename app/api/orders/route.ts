
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { products } from "@/lib/data"

export const runtime = "nodejs"

type OrderItemInput = {
  productId: string
  variant?: string
  quantity: number
}

type OrderInput = {
  items: OrderItemInput[]
  customerName: string
  customerEmail: string
  customerPhone: string
  address: string
  landmark?: string
  city: string
  state: string
  pincode: string
  deliveryNote?: string
  paymentProvider: "upi_qr" | "whatsapp"
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonError("Please sign in before placing an order.", 401)
    }

    let body: OrderInput

    try {
      body = (await request.json()) as OrderInput
    } catch {
      return jsonError("Invalid request body.", 400)
    }

    if (
      !body ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 50
    ) {
      return jsonError("Your cart is empty or contains too many items.", 400)
    }

    const requiredFields = [
      body.customerName,
      body.customerEmail,
      body.customerPhone,
      body.address,
      body.city,
      body.state,
      body.pincode,
    ]

    if (
      requiredFields.some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      return jsonError("Please provide all required delivery details.", 400)
    }

    if (!/^[6-9]\d{9}$/.test(body.customerPhone.trim())) {
      return jsonError("Enter a valid 10-digit Indian mobile number.", 400)
    }

    if (!/^\d{6}$/.test(body.pincode.trim())) {
      return jsonError("Enter a valid 6-digit PIN code.", 400)
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail.trim())) {
      return jsonError("Enter a valid email address.", 400)
    }

    if (
      body.paymentProvider !== "upi_qr" &&
      body.paymentProvider !== "whatsapp"
    ) {
      return jsonError("Invalid payment or ordering method.", 400)
    }

    const aggregated = new Map<
      string,
      { productId: string; variant: string; quantity: number }
    >()

    for (const item of body.items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return jsonError("One or more cart items are invalid.", 400)
      }

      const product = products.find(
        (entry) => entry.id === item.productId,
      )

      if (!product) {
        return jsonError("A product in your cart could not be found.", 400)
      }

      if (product.stock === "out_of_stock") {
        return jsonError(`${product.name} is out of stock.`, 409)
      }

      if (
        product.stock === "low_stock" &&
        typeof product.stockCount === "number" &&
        item.quantity > product.stockCount
      ) {
        return jsonError(
          `There is not enough listed stock for ${product.name}.`,
          409,
        )
      }

      const variant =
        typeof item.variant === "string" && item.variant.trim()
          ? item.variant.trim().slice(0, 100)
          : product.colors[0] ?? "Default"

      if (product.colors.length > 0 && !product.colors.includes(variant)) {
        return jsonError(
          `The selected option for ${product.name} is invalid.`,
          400,
        )
      }

      const key = `${product.id}::${variant}`
      const existing = aggregated.get(key)

      if (existing) {
        existing.quantity += item.quantity
        if (existing.quantity > 99) {
          return jsonError("Requested quantity is too large.", 400)
        }
      } else {
        aggregated.set(key, {
          productId: product.id,
          variant,
          quantity: item.quantity,
        })
      }
    }

    const validatedItems = Array.from(aggregated.values()).map((item) => {
      const product = products.find(
        (entry) => entry.id === item.productId,
      )!

      const unitPricePaise = Math.round(product.price * 100)

      return {
        product,
        variant: item.variant,
        quantity: item.quantity,
        unitPricePaise,
        lineTotalPaise: unitPricePaise * item.quantity,
      }
    })

    const subtotalPaise = validatedItems.reduce(
      (total, item) => total + item.lineTotalPaise,
      0,
    )

    if (
      !Number.isSafeInteger(subtotalPaise) ||
      subtotalPaise < 0
    ) {
      return jsonError("The order total is invalid.", 400)
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        customer_name: body.customerName.trim().slice(0, 100),
        customer_email: body.customerEmail.trim().slice(0, 254),
        customer_phone: body.customerPhone.trim(),
        address: body.address.trim().slice(0, 300),
        landmark: body.landmark?.trim().slice(0, 150) || null,
        city: body.city.trim().slice(0, 100),
        state: body.state.trim().slice(0, 100),
        pincode: body.pincode.trim(),
        delivery_note: body.deliveryNote?.trim().slice(0, 300) || null,
        subtotal_paise: subtotalPaise,
        shipping_paise: 0,
        total_paise: subtotalPaise,
        order_status: "pending_payment",
        payment_status: "pending",
        payment_provider: body.paymentProvider,
      })
      .select("id")
      .single()

    if (orderError || !order) {
      console.error("Order creation failed:", orderError?.message)
      return jsonError("We couldn't create your order. Please try again.", 500)
    }

    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_slug: item.product.slug,
      product_name: item.product.name,
      variant: item.variant,
      quantity: item.quantity,
      unit_price_paise: item.unitPricePaise,
      line_total_paise: item.lineTotalPaise,
    }))

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)

    if (itemsError) {
      console.error("Order item creation failed:", itemsError.message)

      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("customer_id", user.id)

      return jsonError(
        "We couldn't save your order items. Please try again.",
        500,
      )
    }

    return NextResponse.json(
      {
        orderId: order.id,
        orderStatus: "pending_payment",
        paymentStatus: "pending",
        subtotalPaise,
        totalPaise: subtotalPaise,
        message:
          "Order created. Payment remains pending until independently verified.",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Unexpected order creation error:", error)
    return jsonError("An unexpected error occurred. Please try again.", 500)
  }
}
