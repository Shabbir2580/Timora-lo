import Link from "next/link"
import { ArrowLeft, PackageCheck, MapPin, IndianRupee } from "lucide-react"

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0a] px-4 py-10 text-[#f5f1e8] sm:px-6">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60 hover:text-[#f5d76e]">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[#d4af37]">Delivery information</p>
        <h1 className="mt-3 text-4xl font-semibold">Shipping information</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white/60">
          Review the shipping charge and order-processing details before placing your Timora order.
        </p>

        <div className="mt-8 space-y-5">
          <section className="rounded-xl border border-white/10 p-5">
            <IndianRupee className="text-[#d4af37]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Shipping charges</h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-white/65">
              <li className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                <span>Orders below ₹999</span>
                <strong className="shrink-0 text-[#ead8b0]">₹80 shipping</strong>
              </li>
              <li className="flex items-start justify-between gap-4">
                <span>Orders of ₹999 or more</span>
                <strong className="shrink-0 text-[#ead8b0]">Free shipping</strong>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-white/40">
              The final shipping amount is calculated at checkout using the order subtotal and is shown before you place the order.
            </p>
          </section>

          <section className="rounded-xl border border-white/10 p-5">
            <PackageCheck className="text-[#d4af37]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Order processing</h2>
            <p className="mt-2 leading-7 text-white/60">
              Processing and dispatch depend on product availability and payment verification. An order with pending payment or pending Cash on Delivery approval is not confirmation of dispatch.
            </p>
          </section>

          <section className="rounded-xl border border-white/10 p-5">
            <MapPin className="text-[#d4af37]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Delivery estimates</h2>
            <p className="mt-2 leading-7 text-white/60">
              Delivery times and serviceability depend on the destination and courier arrangements. We do not promise a guaranteed delivery date on this page; contact Timora if you need a delivery estimate for your PIN code.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
