
import Link from "next/link"
import { ArrowLeft, Camera, MessageCircle, Phone } from "lucide-react"

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0a] px-4 py-10 text-[#f5f1e8] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60 hover:text-[#dfc797]"
        >
          <ArrowLeft size={16} />
          Home
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[#c9a96e]">
          We're here to help
        </p>

        <h1 className="mt-3 text-4xl font-semibold">Contact Timora</h1>

        <p className="mt-4 max-w-2xl leading-7 text-white/60">
          For product questions, order updates or help with a purchase,
          contact our customer-care team. Keep your order reference ready
          if your question is about an order.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="https://wa.me/919909231028"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 p-5 hover:border-[#c9a96e]/60"
          >
            <MessageCircle className="text-[#c9a96e]" />
            <h2 className="mt-4 font-semibold">WhatsApp support</h2>
            <p className="mt-1 text-sm text-white/55">
              +91 99092 31028
            </p>
          </a>

          <a
            href="tel:+919909231028"
            className="rounded-xl border border-white/10 p-5 hover:border-[#c9a96e]/60"
          >
            <Phone className="text-[#c9a96e]" />
            <h2 className="mt-4 font-semibold">Call customer care</h2>
            <p className="mt-1 text-sm text-white/55">
              +91 99092 31028
            </p>
          </a>

          <a
            href="https://www.instagram.com/_timora_cart_/"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 p-5 hover:border-[#c9a96e]/60"
          >
            <Camera className="text-[#c9a96e]" />
            <h2 className="mt-4 font-semibold">Instagram</h2>
            <p className="mt-1 text-sm text-white/55">
              @_timora_cart_
            </p>
          </a>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Support hours and response times have not been published.
          Please do not assume a specific response time.
        </p>
      </div>
    </main>
  )
}
