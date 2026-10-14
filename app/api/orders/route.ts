
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { products as sampleProducts } from "@/lib/data";

export const runtime = "nodejs";

type PaymentProvider = "upi_qr" | "whatsapp" | "cod";

type RequestItem = {
  productId: string;
  variant?: string;
  quantity: number;
};

type ResolvedItem = {
  productId: string;
  productSlug: string;
  productName: string;
  variant: string;
  quantity: number;
  unitPricePaise: number;
  stock: number;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Please sign in before placing your order.", 401);
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid order request.");
    }

    const rawItems = body.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
      return errorResponse("Your cart must contain between 1 and 50 items.");
    }

    const customerName = cleanText(body.customerName, 120);
    const customerEmail = cleanText(body.customerEmail, 254).toLowerCase();
    const customerPhone = cleanText(body.customerPhone, 20).replace(/\D/g, "");
    const address = cleanText(body.address, 500);
    const landmark = cleanText(body.landmark, 200);
    const city = cleanText(body.city, 100);
    const state = cleanText(body.state, 100);
    const pincode = cleanText(body.pincode, 10);
    const deliveryNote = cleanText(body.deliveryNote, 500);

    const paymentProvider = body.paymentProvider as PaymentProvider;

    if (
      !customerName ||
      !customerEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      !/^\d{10}$/.test(customerPhone) ||
      !address ||
      !city ||
      !state ||
      !/^\d{6}$/.test(pincode)
    ) {
      return errorResponse(
        "Please check your name, email, 10-digit phone number, address and 6-digit PIN code."
      );
    }

    if (!["upi_qr", "whatsapp", "cod"].includes(paymentProvider)) {
      return errorResponse("Please select a valid payment method.");
    }

    const requestedItems: RequestItem[] = [];

    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== "object") {
        return errorResponse("Your cart contains an invalid item.");
      }

      const item = rawItem as Record<string, unknown>;
      const productId = cleanText(item.productId, 100);
      const quantity = item.quantity;
      const variant = cleanText(item.variant, 120) || "Default";

      if (
        !productId ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        return errorResponse("A product or quantity in your cart is invalid.");
      }

      requestedItems.push({ productId, variant, quantity });
    }

    // Combine duplicate product + variant lines before checking stock.
    const grouped = new Map<string, RequestItem>();

    for (const item of requestedItems) {
      const key = `${item.productId}::${item.variant}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.quantity += item.quantity;

        if (existing.quantity > 99) {
          return errorResponse("The quantity for an item cannot exceed 99.");
        }
      } else {
        grouped.set(key, { ...item });
      }
    }

    const items = Array.from(grouped.values());
    const databaseIds = items
      .map((item) => item.productId)
      .filter((id) => UUID_REGEX.test(id));

    const databaseProducts = new Map<string, {
      id: string;
      name: string;
      slug: string;
      price: number;
      stock: number;
      is_active: boolean;
    }>();

    // Fetch current prices and stock for products saved in Supabase.
    if (databaseIds.length > 0) {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, stock, is_active")
        .in("id", [...new Set(databaseIds)]);

      if (error) {
        console.error("Product lookup failed:", error.message);
        return errorResponse("We couldn't verify product availability. Please try again.", 500);
      }

      for (const product of data ?? []) {
        databaseProducts.set(product.id, product);
      }
    }

    const resolvedItems: ResolvedItem[] = [];

    for (const item of items) {
      const databaseProduct = databaseProducts.get(item.productId);

      if (databaseProduct) {
        if (!databaseProduct.is_active) {
          return errorResponse(`"${databaseProduct.name}" is no longer available.`);
        }

        if (
          !Number.isFinite(Number(databaseProduct.price)) ||
          Number(databaseProduct.price) < 0 ||
          !Number.isInteger(Number(databaseProduct.stock)) ||
          Number(databaseProduct.stock) < 0
        ) {
          return errorResponse(`"${databaseProduct.name}" has invalid product data.`, 500);
        }

        if (item.quantity > databaseProduct.stock) {
          return errorResponse(
            `Only ${databaseProduct.stock} unit(s) of "${databaseProduct.name}" are currently in stock.`
          );
        }

        resolvedItems.push({
          productId: databaseProduct.id,
          productSlug: databaseProduct.slug,
          productName: databaseProduct.name,
          variant: item.variant,
          quantity: item.quantity,
          unitPricePaise: Math.round(Number(databaseProduct.price) * 100),
          stock: databaseProduct.stock,
        });

        continue;
      }

      // Support existing sample products such as p1, p2, and p3.
      const sample = sampleProducts.find(
        (product) => product.id === item.productId
      );

      if (!sample) {
        return errorResponse(
          "A product in your cart could not be found. Please remove it and add it again."
        );
      }

      if (sample.stock === "out_of_stock") {
        return errorResponse(`"${sample.name}" is out of stock.`);
      }

      const requestedVariant = item.variant;
      const validVariants = sample.colors ?? [];

      if (
        validVariants.length > 0 &&
        requestedVariant !== "Default" &&
        !validVariants.includes(requestedVariant)
      ) {
        return errorResponse(
          `Please select a valid option for "${sample.name}".`
        );
      }

      const sampleStock =
        typeof sample.stockCount === "number"
          ? sample.stockCount
          : sample.stock === "low_stock"
            ? 5
            : 99;

      if (item.quantity > sampleStock) {
        return errorResponse(
          `There may not be enough stock for "${sample.name}". Please reduce the quantity or contact support.`
        );
      }

      resolvedItems.push({
        productId: sample.id,
        productSlug: sample.slug,
        productName: sample.name,
        variant: requestedVariant,
        quantity: item.quantity,
        unitPricePaise: Math.round(Number(sample.price) * 100),
        stock: sampleStock,
      });
    }

    const subtotalPaise = resolvedItems.reduce(
      (sum, item) => sum + item.unitPricePaise * item.quantity,
      0
    );

    // Keep shipping at zero until your shipping rules are configured.
    const shippingPaise = 0;
    const totalPaise = subtotalPaise + shippingPaise;

    if (
      !Number.isSafeInteger(subtotalPaise) ||
      !Number.isSafeInteger(totalPaise) ||
      subtotalPaise <= 0
    ) {
      return errorResponse("The order total is invalid. Please contact support.");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        address,
        landmark: landmark || null,
        city,
        state,
        pincode,
        delivery_note: deliveryNote || null,
        subtotal_paise: subtotalPaise,
        shipping_paise: shippingPaise,
        total_paise: totalPaise,
        order_status: "pending_payment",
payment_status: "pending",
        payment_provider: paymentProvider,
        payment_reference: null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation failed:", orderError?.message);
      return errorResponse("We couldn't create your order. Please try again.", 500);
    }

    const orderItems = resolvedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_slug: item.productSlug,
      product_name: item.productName,
      variant: item.variant,
      quantity: item.quantity,
      unit_price_paise: item.unitPricePaise,
      line_total_paise: item.unitPricePaise * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items creation failed:", itemsError.message);

      // The order may already exist. Do not claim it was cancelled.
      return NextResponse.json(
        {
          error:
            "Your order could not be fully saved. Please contact Timora support before placing it again.",
          orderId: order.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        message:
          paymentProvider === "cod"
            ? "COD order created and awaiting admin or authorized employee approval. Do not dispatch until approved."
            : "Order created. Payment and stock still need verification before dispatch.",
        orderStatus: "pending_payment",
        paymentStatus: "pending",
        subtotalPaise,
        shippingPaise,
        totalPaise,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected order API error:", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}
