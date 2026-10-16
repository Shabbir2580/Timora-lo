
"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
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
  Package,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Star,
  LogIn,
} from "lucide-react"
import { useCart, type CartLine } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"

type PaymentMethod = "upi" | "whatsapp" | "cod"

type Address = {
  id: string
  user_id: string
  full_name: string
  phone: string
  address: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  delivery_note: string | null
  address_label: string
  is_default: boolean
}

type AddressForm = {
  fullName: string
  phone: string
  address: string
  landmark: string
  city: string
  state: string
  pincode: string
  deliveryNote: string
  addressLabel: string
}

const emptyAddress: AddressForm = {
  fullName: "",
  phone: "",
  address: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  deliveryNote: "",
  addressLabel: "Home",
}

// Serve the QR image from this app's own public folder instead of relying on GitHub Raw.
const QR_IMAGE_URL = "/payment/timora-upi-qr.png"

function formatPrice(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  })
}

function toAddressForm(address: Address): AddressForm {
  return {
    fullName: address.full_name,
    phone: address.phone,
    address: address.address,
    landmark: address.landmark ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    deliveryNote: address.delivery_note ?? "",
    addressLabel: address.address_label || "Home",
  }
}

export default function CheckoutPage() {
  const { lines, count, subtotal, clearCart } = useCart()
  const supabase = useMemo(() => createClient(), [])

  const [submitted, setSubmitted] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  // Synchronous guard prevents two submit events from creating duplicate orders before React rerenders.
  const submittingOrderRef = useRef(false)
  const [submitError, setSubmitError] = useState("")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [serverTotals, setServerTotals] = useState<{ subtotalPaise: number; shippingPaise: number; discountPaise: number; totalPaise: number } | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [submittedOrderLines, setSubmittedOrderLines] = useState<CartLine[] | null>(null)
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("upi")

  const [form, setForm] = useState<AddressForm>(emptyAddress)
  const [email, setEmail] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [addressEditorOpen, setAddressEditorOpen] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressMessage, setAddressMessage] = useState("")
  const [profileMessage, setProfileMessage] = useState("")

  const displayLines = submittedOrderLines ?? lines
  const displayCount = displayLines.reduce((sum, line) => sum + line.quantity, 0)
  const displaySubtotal = displayLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)

  const updateField = (
    field: keyof AddressForm,
    value: string,
  ) => {
    if (orderId) return
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
    setSubmitted(false)
    setSubmitError("")
    setOrderId(null)
    setServerTotals(null)
    setAddressMessage("")
  }

  const loadAddresses = useCallback(async (currentUserId: string) => {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        "id,user_id,full_name,phone,address,landmark,city,state,pincode,delivery_note,address_label,is_default",
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Could not load saved addresses:", error.message)
      setAddressMessage(
        "We couldn't load your saved addresses. You can still enter your delivery details.",
      )
      return
    }

    const saved = (data ?? []) as Address[]
    setAddresses(saved)

    if (saved.length > 0) {
      const preferred = saved.find((item) => item.is_default) ?? saved[0]
      setSelectedAddressId(preferred.id)
      setForm(toAddressForm(preferred))
      setIsDefault(preferred.is_default)
      setAddressEditorOpen(false)
    }
  }, [supabase])

  useEffect(() => {
    let active = true

    async function loadCustomer() {
      setLoadingProfile(true)

      const { data, error } = await supabase.auth.getUser()

      if (!active) return

      if (error || !data.user) {
        setUserId(null)
        setLoadingProfile(false)
        setProfileMessage(
          "Sign in to save addresses and have your account details filled in automatically.",
        )
        return
      }

      const user = data.user
      setUserId(user.id)
      setEmail(user.email ?? "")

      const metadataName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : ""

      setForm((previous) => ({
        ...previous,
        fullName: previous.fullName || metadataName,
      }))

      await loadAddresses(user.id)

      if (active) {
        setLoadingProfile(false)
        setProfileMessage("")
      }
    }

    void loadCustomer()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (active) void loadCustomer()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, loadAddresses])

  function selectAddress(address: Address) {
    setSelectedAddressId(address.id)
    setForm(toAddressForm(address))
    setIsDefault(address.is_default)
    setAddressEditorOpen(false)
    setAddressMessage("")
    setSubmitted(false)
  }

  function startNewAddress() {
    setSelectedAddressId("")
    setForm((previous) => ({
      ...emptyAddress,
      fullName: previous.fullName,
      phone: previous.phone,
    }))
    setIsDefault(addresses.length === 0)
    setAddressEditorOpen(true)
    setAddressMessage("")
    setSubmitted(false)
  }

  async function saveAddress(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!userId) {
      setAddressMessage("Please sign in before saving a delivery address.")
      return false
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setAddressMessage("Enter a valid 10-digit Indian mobile number.")
      return false
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setAddressMessage("Enter a valid 6-digit PIN code.")
      return false
    }

    setSavingAddress(true)
    setAddressMessage("")

    try {
      if (isDefault) {
        const { error: defaultError } = await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", userId)

        if (defaultError) throw defaultError
      }

      const payload = {
        user_id: userId,
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        landmark: form.landmark.trim() || null,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        delivery_note: form.deliveryNote.trim() || null,
        address_label: form.addressLabel.trim() || "Home",
        is_default: isDefault || addresses.length === 0,
      }

      if (selectedAddressId) {
        const { error } = await supabase
          .from("addresses")
          .update(payload)
          .eq("id", selectedAddressId)
          .eq("user_id", userId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("addresses")
          .insert(payload)
          .select("id")
          .single()

        if (error) throw error
        if (data?.id) setSelectedAddressId(data.id)
      }

      await loadAddresses(userId)
      setAddressEditorOpen(false)
      setAddressMessage("Address saved successfully.")
      return true
    } catch (error) {
      console.error("Could not save address:", error)
      setAddressMessage(
        "We couldn't save this address. Please check your connection and try again.",
      )
      return false
    } finally {
      setSavingAddress(false)
    }
  }

  async function deleteAddress(addressId: string) {
    if (!userId) return

    const confirmed = window.confirm(
      "Delete this saved delivery address?",
    )
    if (!confirmed) return

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId)

    if (error) {
      setAddressMessage("We couldn't delete that address. Please try again.")
      return
    }

    const remaining = addresses.filter((item) => item.id !== addressId)
    setAddresses(remaining)

    if (selectedAddressId === addressId) {
      setSelectedAddressId("")
      setForm((previous) => ({
        ...emptyAddress,
        fullName: previous.fullName,
        phone: previous.phone,
      }))
      setAddressEditorOpen(true)
    }

    setAddressMessage("Address deleted.")
    await loadAddresses(userId)
  }

  async function makeDefault(address: Address) {
    if (!userId) return

    const { error: clearError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId)

    if (clearError) {
      setAddressMessage("Couldn't update the default address.")
      return
    }

    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", address.id)
      .eq("user_id", userId)

    if (error) {
      setAddressMessage("Couldn't update the default address.")
      return
    }

    await loadAddresses(userId)
    setAddressMessage("Default address updated.")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError("")

    if (lines.length === 0) return

    if (!form.fullName.trim()) {
      setSubmitError("Enter the customer's full name.")
      return
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setSubmitError("Enter a valid 10-digit Indian mobile number.")
      return
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setSubmitError("Enter a valid 6-digit PIN code.")
      return
    }

    if (!form.address.trim() || !form.city.trim() || !form.state.trim()) {
      setSubmitError("Complete all required delivery address fields.")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSubmitError("Enter a valid email address.")
      return
    }

    // Guest customers can prepare a WhatsApp request, but the API requires
    // an authenticated account before it can save an order in Supabase.
    if (!userId) {
      if (paymentMethod === "whatsapp") {
        setOrderId(null)
    setServerTotals(null)
        setSubmitted(true)
        return
      }

      setSubmitError(
        paymentMethod === "cod"
          ? "Please sign in before placing a COD order."
          : "Please sign in before creating an order and continuing to UPI payment.",
      )
      return
    }

    if (submittingOrderRef.current) return
    submittingOrderRef.current = true
    setSubmittingOrder(true)

    try {
      if (addressEditorOpen) {
        const saved = await saveAddress()
        if (!saved) return
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            productId: line.product.id,
            variant: line.variant,
            quantity: line.quantity,
          })),
          customerName: form.fullName.trim(),
          customerEmail: email.trim(),
          customerPhone: form.phone.trim(),
          address: form.address.trim(),
          landmark: form.landmark.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          deliveryNote: form.deliveryNote.trim() || undefined,
          paymentProvider: paymentMethod === "upi" ? "upi_qr" : paymentMethod === "cod" ? "cod" : "whatsapp",
          couponCode: couponCode.trim().toUpperCase() || undefined,
        }),
      })

      const result = (await response.json().catch(() => ({}))) as {
        orderId?: string
        error?: string
        message?: string
        subtotalPaise?: number
        shippingPaise?: number
        discountPaise?: number
        totalPaise?: number
      }

      if (!response.ok || !result.orderId) {
        throw new Error(
          result.error || "We couldn't create your order. Please try again.",
        )
      }

      setOrderId(result.orderId)
      setSubmittedOrderLines(lines.map((line) => ({ ...line, product: { ...line.product } })))
      clearCart()
      if (Number.isFinite(result.subtotalPaise) && Number.isFinite(result.shippingPaise) && Number.isFinite(result.totalPaise)) {
        setServerTotals({ subtotalPaise: Number(result.subtotalPaise), shippingPaise: Number(result.shippingPaise), discountPaise: Number(result.discountPaise ?? 0), totalPaise: Number(result.totalPaise) })
      }
      setSubmitted(true)
    } catch (error) {
      console.error("Checkout order creation failed:", error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We couldn't create your order. Please try again.",
      )
      setSubmitted(false)
    } finally {
      submittingOrderRef.current = false
      setSubmittingOrder(false)
    }
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  const labelClass = "block text-sm font-medium"
  const whatsappNumber = "919909231028"

  const whatsappMessage = [
    "Hello Timora! I would like to place an order.",
    orderId ? `Order reference: ${orderId}` : "",
    "",
    "CUSTOMER DETAILS",
    `Name: ${form.fullName.trim()}`,
    `Phone: ${form.phone.trim()}`,
    `Email: ${email.trim()}`,
    "",
    "DELIVERY ADDRESS",
    form.address.trim(),
    form.landmark.trim() ? `Landmark: ${form.landmark.trim()}` : "",
    `${form.city.trim()}, ${form.state.trim()} - ${form.pincode.trim()}`,
    form.deliveryNote.trim()
      ? `Delivery instructions: ${form.deliveryNote.trim()}`
      : "",
    "",
    "ORDER ITEMS",
    ...displayLines.map(
      (line) =>
        `${line.product.name} | Option: ${line.variant} | Qty: ${line.quantity} | ${formatPrice(line.product.price * line.quantity)}`,
    ),
    "",
    ...(couponCode.trim()
      ? [serverTotals
          ? `Coupon ${couponCode.trim().toUpperCase()} validated at order creation; discount: ${formatPrice(serverTotals.discountPaise / 100)}`
          : `Coupon requested: ${couponCode.trim().toUpperCase()} (not yet validated; please confirm eligibility and discount)`]
      : []),
    `Total items: ${displayCount}`,
    `Subtotal: ${formatPrice(serverTotals ? serverTotals.subtotalPaise / 100 : displaySubtotal)}`,
    ...(serverTotals && serverTotals.discountPaise > 0 ? [`Discount: -${formatPrice(serverTotals.discountPaise / 100)}`] : []),
    `Shipping: ${serverTotals ? formatPrice(serverTotals.shippingPaise / 100) : "To be confirmed"}`,
    ...(serverTotals ? [`Order total: ${formatPrice(serverTotals.totalPaise / 100)}`] : []),
    "",
    paymentMethod === "upi"
      ? "I intend to pay using the Timora UPI QR code. Please confirm availability and the final amount."
      : paymentMethod === "cod"
        ? "I would like to request Cash on Delivery. I understand this order requires approval before dispatch."
        : "Please confirm product availability, shipping charges, and payment instructions.",
    "",
    "Please confirm my order details before dispatch.",
  ]
    .filter(Boolean)
    .join("\n")

  const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  if (lines.length === 0 && !submittedOrderLines) {
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
            Confirm your delivery details before continuing.
          </p>
        </div>

        {loadingProfile && (
          <p className="mb-5 text-sm text-muted-foreground">
            Checking your account and saved addresses…
          </p>
        )}

        {!loadingProfile && !userId && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <LogIn className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Sign in to save your addresses</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can continue checkout, but saved addresses are available
                  only to signed-in customers.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        )}

        {profileMessage && (
          <p className="mb-5 text-sm text-muted-foreground">{profileMessage}</p>
        )}

        {submitError && (
          <div role="alert" className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {submitError}
          </div>
        )}

        {submitted && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <h2 className="font-semibold">{orderId ? "Order created successfully" : "Ready to continue on WhatsApp"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {orderId
                    ? `Order reference: ${orderId}. Your order is saved with payment pending. It is not confirmed for dispatch, and payment has not been verified.`
                    : "Your details are ready to send to Timora. No database order was created because you are not signed in. Review the WhatsApp message before sending it."}
                </p>
                {orderId && (
                  <Link
                    href="/orders"
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    <Package className="size-4" aria-hidden="true" />
                    View My Orders
                  </Link>
                )}
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
                  <h2 className="text-lg font-semibold">Contact information</h2>
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
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                  />
                </label>
              </div>
            </section>

            {userId && addresses.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Saved addresses</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose where you want this order delivered.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewAddress}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent"
                  >
                    <Plus className="size-4" />
                    Add address
                  </button>
                </div>

                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`rounded-xl border p-4 ${
                        selectedAddressId === address.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={selectedAddressId === address.id}
                          onChange={() => selectAddress(address)}
                          className="mt-1 accent-current"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-semibold">
                            {address.address_label}
                            {address.is_default && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                                Default
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-sm">
                            {address.full_name} · {address.phone}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {address.address}
                            {address.landmark ? `, ${address.landmark}` : ""}
                            {`, ${address.city}, ${address.state} - ${address.pincode}`}
                          </span>
                        </span>
                      </label>

                      <div className="mt-3 flex flex-wrap gap-2 pl-7">
                        <button
                          type="button"
                          onClick={() => {
                            selectAddress(address)
                            setAddressEditorOpen(true)
                          }}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold hover:bg-accent"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        {!address.is_default && (
                          <button
                            type="button"
                            onClick={() => void makeDefault(address)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold hover:bg-accent"
                          >
                            <Star className="size-3.5" />
                            Set default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteAddress(address.id)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-destructive hover:bg-accent"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(!userId || addressEditorOpen || addresses.length === 0) && (
              <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-secondary">
                    <Truck className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Delivery address</h2>
                    <p className="text-sm text-muted-foreground">
                      Where should we deliver your order?
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {userId && (
                    <label className={labelClass}>
                      Address label *
                      <select
                        className={inputClass}
                        value={form.addressLabel}
                        onChange={(event) =>
                          updateField("addressLabel", event.target.value)
                        }
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                  )}

                  <label className={`${labelClass} ${userId ? "" : "sm:col-span-2"}`}>
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

                {userId && (
                  <div className="mt-5 space-y-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(event) => setIsDefault(event.target.checked)}
                        className="size-4 accent-current"
                      />
                      Set as my default address
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={savingAddress}
                        onClick={() => void saveAddress()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                      >
                        {savingAddress ? "Saving…" : "Save address"}
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddressEditorOpen(false)
                            const current = addresses.find(
                              (item) => item.id === selectedAddressId,
                            )
                            if (current) selectAddress(current)
                          }}
                          className="min-h-11 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-accent"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!userId && (
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Sign in to save this address for future orders.
                  </p>
                )}
              </section>
            )}

            {addressMessage && (
              <p role="status" className="text-sm text-muted-foreground">
                {addressMessage}
              </p>
            )}

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
                      if (orderId) return
                      setPaymentMethod("upi")
                      setSubmitted(false)
                      setSubmitError("")
                      setOrderId(null)
    setServerTotals(null)
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
                      if (orderId) return
                      setPaymentMethod("whatsapp")
                      setSubmitted(false)
                      setSubmitError("")
                      setOrderId(null)
    setServerTotals(null)
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

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors sm:col-span-2 ${
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => {
                      if (orderId) return
                      setPaymentMethod("cod")
                      setSubmitted(false)
                      setSubmitError("")
                      setOrderId(null)
    setServerTotals(null)
                    }}
                    className="mt-1 accent-current"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      <Truck className="size-4" aria-hidden="true" />
                      Cash on Delivery (COD)
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Request COD. Your order must be approved by Timora admin or an authorized employee before dispatch.
                    </span>
                  </span>
                </label>
              </div>
              {paymentMethod === "cod" && (
                <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-6">
                  COD orders are not confirmed immediately. Admin or authorized employee approval is required before the order can proceed to dispatch.
                </p>
              )}
            </section>

            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <LockKeyhole
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Saved addresses are linked to your signed-in account.
                Orders are saved in Supabase for signed-in customers. Payment
                remains pending until independently verified. Do not dispatch
                an order until payment and stock have been verified.
              </p>
            </div>

            <button
              type="submit"
              disabled={submittingOrder || Boolean(orderId) || (count === 0 && !submittedOrderLines)}
              className="min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingOrder
                ? "Creating order…"
                : paymentMethod === "upi"
                  ? "Create order and continue to UPI"
                  : paymentMethod === "cod"
                    ? "Place COD Order — Awaiting Approval"
                    : "Create order / prepare WhatsApp"}
            </button>
          </form>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold">Order summary</h2>

              <div className="mt-5 space-y-4">
                {displayLines.map((line) => (
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

              <div className="mt-5 rounded-xl border border-border bg-background/60 p-3">
                <label htmlFor="coupon-code" className="text-sm font-medium">Coupon code</label>
                <div className="mt-2 flex gap-2"><input id="coupon-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40))} disabled={Boolean(orderId)} maxLength={40} placeholder="Enter code" className="min-h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm uppercase outline-none focus:border-ring disabled:opacity-60"/><span className="inline-flex items-center rounded-lg border border-border px-3 text-xs text-muted-foreground">{serverTotals ? serverTotals.discountPaise > 0 ? "Applied" : couponCode ? "Checked" : "—" : "Validated at checkout"}</span></div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Coupon validity, minimum spend and usage limits are checked securely by the server when you place the order.</p>
              </div>

              <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Items ({displayCount})
                  </span>
                  <span>{formatPrice(serverTotals ? serverTotals.subtotalPaise / 100 : displaySubtotal)}</span>
                </div>
                {serverTotals && serverTotals.discountPaise > 0 && <div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-300"><span>Coupon {couponCode ? `(${couponCode})` : "discount"}</span><span>−{formatPrice(serverTotals.discountPaise / 100)}</span></div>}
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{serverTotals ? formatPrice(serverTotals.shippingPaise / 100) : "Calculated at order creation"}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-4">
                  <span className="font-semibold">{serverTotals ? "Server-verified order total" : "Estimated subtotal"}</span>
                  <span className="text-lg font-bold">
                    {formatPrice(serverTotals ? serverTotals.totalPaise / 100 : displaySubtotal)}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {serverTotals ? "The order total was calculated by the server from current catalogue prices. Your cart has been cleared to prevent accidental duplicate orders. Payment remains pending until independently verified." : "This is an estimate based on your saved cart. The server rechecks current prices and stock when you place the order."}
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
                  <h2 id="upi-payment-heading" className="text-lg font-bold">
                    Pay using UPI QR
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Scan the merchant QR code with your UPI app. Check the payable
                  amount below against the server-calculated order total before paying.
                </p>

                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white p-3">
                  <img
                    src={QR_IMAGE_URL}
                    alt="Timora merchant UPI payment QR code"
                    width={480}
                    height={480}
                    className="mx-auto aspect-square w-full max-w-[320px] object-contain"
                  />
                </div>

                {orderId && (
                  <p className="mt-3 break-all text-center text-xs text-muted-foreground">
                    Order reference: {orderId}
                  </p>
                )}
                <p className="mt-3 text-center text-sm font-semibold">
                  {serverTotals ? "Payable amount (including shipping and discount)" : "Estimated cart subtotal (final amount calculated at order creation)"}: {formatPrice(serverTotals ? serverTotals.totalPaise / 100 : displaySubtotal)}
                </p>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Verify the merchant name in your UPI app before paying.
                  This QR image does not automatically verify payment or
                  confirm your order.
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

            {submitted && paymentMethod === "cod" && orderId && (
              <section
                aria-labelledby="cod-order-heading"
                className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Truck className="size-5 text-primary" aria-hidden="true" />
                  <h2 id="cod-order-heading" className="text-lg font-bold">
                    COD request submitted
                  </h2>
                </div>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  Order reference: {orderId}
                </p>
                <p className="mt-3 text-sm leading-6">
                  Your COD order is awaiting approval by Timora admin or an authorized employee. It is not confirmed for dispatch, and no payment has been collected.
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
                  <h2 id="whatsapp-order-heading" className="text-lg font-bold">
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
