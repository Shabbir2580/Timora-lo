
"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  MapPin,
  MessageCircle,
  QrCode,
  ShoppingBag,
  Truck,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"

type PaymentMethod = "upi" | "whatsapp"

function formatPrice(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  })
}

export default function CheckoutPage() {
  const { lines, count, subtotal } = useCart()

  const [submitted, setSubmitted] = useState(false)
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("upi")

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    deliveryNote: "",
  })

  const updateField = (
    field: keyof typeof form,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
    setSubmitted(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (lines.length === 0) {
      return
    }

    const phoneValid = /^[6-9]\d{9}$/.test(form.phone.trim())
    const pincodeValid = /^\d{6}$/.test(form.pincode.trim())

    if (!phoneValid) {
      alert("Enter a valid 10-digit Indian mobile number.")
      return
    }

    if (!pincodeValid) {
      alert("Enter a valid 6-digit PIN code.")
      return
    }

    setSubmitted(true)
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  const labelClass = "block text-sm font-medium"

  const whatsappNumber = "919909231028"

  const whatsappMessage = [
    "Hello Timora! I would like to place an order.",
    "",
    "CUSTOMER DETAILS",
    `Name: ${form.fullName.trim()}`,
    `Phone: ${form.phone.trim()}`,
    `Email: ${form.email.trim()}`,
    "",
    "DELIVERY ADDRESS",
    form.address.trim(),
    form.landmark.trim()
      ? `Landmark: ${form.landmark.trim()}`
      : "",
    `${form.city.trim()}, ${form.state.trim()} - ${form.pincode.trim()}`,
    form.deliveryNote.trim()
      ? `Delivery instructions: ${form.deliveryNote.trim()}`
      : "",
    "",
    "ORDER ITEMS",
    ...lines.map(
      (line) =>
        `${line.product.name} | Option: ${line.variant} | Qty: ${line.quantity} | ${formatPrice(line.product.price * line.quantity)}`,
    ),
    "",
    `Total items: ${count}`,
    `Subtotal: ${formatPrice(subtotal)}`,
    "Shipping: To be confirmed",
    "",
    paymentMethod === "upi"
      ? "I intend to pay using the Timora UPI QR code. Please confirm availability and the final amount."
      : "Please confirm product availability, shipping charges, and payment instructions.",
    "",
    "Please confirm my order details before dispatch.",
  ]
    .filter(Boolean)
    .join("\n")

  const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  if (lines.length === 0) {
    return (
      <main className="flex min-h-[65vh] flex-col items-center justify-center bg-background px-5 text-center text-foreground">
        <div className="mb-5 grid size-16 place-items-center rounded-full bg-secondary">
          <ShoppingBag className="size-7 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold">Your cart is empty</h1>

        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Add products to your cart before proceeding to checkout.
        </p>

        <Link
          href="/products"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Browse products
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/cart"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to cart
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            TIMORA CHECKOUT
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Delivery details
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Enter your details to prepare your order.
          </p>
        </div>

        {submitted && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-600" />

              <div>
                <h2 className="font-semibold">
                  Delivery details validated
                </h2>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your form passed validation. Your order is not yet
                  confirmed, and payment has not been verified.
                  Continue with your selected payment or WhatsApp option
                  below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary">
                  <MapPin className="size-5 text-primary" aria-hidden="true" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    Contact information
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Details for delivery updates
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Full name *
                  <input
                    className={inputClass}
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    placeholder="Enter your full name"
                    required
                    maxLength={100}
                  />
                </label>

                <label className={labelClass}>
                  Mobile number *
                  <input
                    className={inputClass}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="10-digit mobile number"
                    pattern="[6-9][0-9]{9}"
                    title="Enter a valid 10-digit Indian mobile number"
                    required
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Email address *
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary">
                  <Truck className="size-5 text-primary" aria-hidden="true" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    Delivery address
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Where should we deliver your order?
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={`${labelClass} sm:col-span-2`}>
                  House number, street and area *
                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="House/flat number, street, locality"
                    required
                    maxLength={300}
                  />
                </label>

                <label className={labelClass}>
                  Landmark
                  <input
                    className={inputClass}
                    value={form.landmark}
                    onChange={(event) =>
                      updateField("landmark", event.target.value)
                    }
                    placeholder="Nearby landmark (optional)"
                    maxLength={150}
                  />
                </label>

                <label className={labelClass}>
                  PIN code *
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.pincode}
                    onChange={(event) =>
                      updateField(
                        "pincode",
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="6-digit PIN code"
                    pattern="[0-9]{6}"
                    title="Enter a 6-digit PIN code"
                    required
                  />
                </label>

                <label className={labelClass}>
                  City *
                  <input
                    className={inputClass}
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="City"
                    required
                    maxLength={100}
                  />
                </label>

                <label className={labelClass}>
                  State *
                  <input
                    className={inputClass}
                    autoComplete="address-level1"
                    value={form.state}
                    onChange={(event) =>
                      updateField("state", event.target.value)
                    }
                    placeholder="State"
                    required
                    maxLength={100}
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Delivery instructions
                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    value={form.deliveryNote}
                    onChange={(event) =>
                      updateField("deliveryNote", event.target.value)
                    }
                    placeholder="Optional instructions for the delivery partner"
                    maxLength={300}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Choose how to continue
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a payment or ordering option.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    paymentMethod === "upi"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === "upi"}
                    onChange={() => {
                      setPaymentMethod("upi")
                      setSubmitted(false)
                    }}
                    className="mt-1 accent-current"
                  />

                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      <QrCode className="size-4" aria-hidden="true" />
                      Pay by UPI QR
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Scan the merchant QR code to pay.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    paymentMethod === "whatsapp"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="whatsapp"
                    checked={paymentMethod === "whatsapp"}
                    onChange={() => {
                      setPaymentMethod("whatsapp")
                      setSubmitted(false)
                    }}
                    className="mt-1 accent-current"
                  />

                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      <MessageCircle className="size-4" aria-hidden="true" />
                      Order via WhatsApp
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Send your order details to Timora.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <LockKeyhole
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />

              <p className="text-xs leading-5 text-muted-foreground">
                Your details are currently handled in this browser.
                This demonstration checkout does not save addresses to a
                database, verify payments, or create confirmed orders.
                Please do not dispatch an order until payment and stock
                have been independently verified.
              </p>
            </div>

            <button
              type="submit"
              className="min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {paymentMethod === "upi"
                ? "Continue to UPI payment"
                : "Prepare WhatsApp order"}
            </button>
          </form>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold">Order summary</h2>

              <div className="mt-5 space-y-4">
                {lines.map((line) => (
                  <div
                    key={`${line.product.id}-${line.variant}`}
                    className="flex gap-3"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      <Image
                        src={line.product.image || "/placeholder.svg"}
                        alt={line.product.name}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">
                        {line.product.name}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {line.variant} · Qty {line.quantity}
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatPrice(line.product.price * line.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Items ({count})
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-right text-xs text-muted-foreground">
                    To be confirmed
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t border-border pt-4">
                  <span className="font-semibold">
                    Subtotal before shipping
                  </span>
                  <span className="text-lg font-bold">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Final payable amount may include shipping, taxes, and
                discounts. This is not a confirmed order total.
              </p>

              <Link
                href="/cart"
                className="mt-5 block text-center text-sm font-medium text-primary hover:underline"
              >
                Edit cart
              </Link>
            </div>

            {submitted && paymentMethod === "upi" && (
              <section
                aria-labelledby="upi-payment-heading"
                className="rounded-xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="size-5 text-primary" aria-hidden="true" />
                  <h2
                    id="upi-payment-heading"
                    className="text-lg font-bold"
                  >
                    Pay using UPI QR
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Scan your merchant QR code with your UPI app. Confirm
                  the final amount with Timora if shipping or other charges
                  apply.
                </p>

                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white p-3">
                  <Image
                    src="https://raw.githubusercontent.com/Shabbir2580/Timora-lo/refs/heads/main/public/payment/timora-upi-qr.png?token=GHSAT0AAAAAAEL4XKSM3NIWKIYRYVXBCJ2K2WLHVIQ"
                    alt="Timora merchant UPI payment QR code"
                    width={480}
                    height={480}
                    className="mx-auto h-auto w-full max-w-[320px] object-contain"
                  />
                </div>

                <p className="mt-3 text-center text-sm font-semibold">
                  Cart subtotal: {formatPrice(subtotal)}
                </p>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Verify the merchant name in your UPI app before paying.
                  This QR image does not automatically verify payment
                  or confirm your order.
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Send order details to Timora
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>

                <p className="mt-2 text-center text-xs text-muted-foreground">
                  After payment, send your order details to arrange
                  confirmation.
                </p>
              </section>
            )}

            {submitted && paymentMethod === "whatsapp" && (
              <section
                aria-labelledby="whatsapp-order-heading"
                className="rounded-xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  <h2
                    id="whatsapp-order-heading"
                    className="text-lg font-bold"
                  >
                    Continue on WhatsApp
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  WhatsApp will open with your contact details, delivery
                  address, cart items, and subtotal prepared in a message.
                  Review it before sending.
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Send order on WhatsApp
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>

                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Sending this message is a request, not an order
                  confirmation. Timora must confirm product availability,
                  shipping charges, and payment instructions.
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
