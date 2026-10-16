import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Camera, Clock3, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react"

const contactOptions = [
  {
    title: "WhatsApp support",
    detail: "+91 99092 31028",
    description: "Message us about products, delivery, or an existing order.",
    href: "https://wa.me/919909231028",
    action: "Start a conversation",
    icon: MessageCircle,
    external: true,
  },
  {
    title: "Call customer care",
    detail: "+91 99092 31028",
    description: "Prefer speaking to someone? Call our customer-care number.",
    href: "tel:+919909231028",
    action: "Call Timora",
    icon: Phone,
    external: false,
  },
  {
    title: "Instagram",
    detail: "@_timora_cart_",
    description: "Follow the latest arrivals, updates, and Timora highlights.",
    href: "https://www.instagram.com/_timora_cart_/",
    action: "Visit our profile",
    icon: Camera,
    external: true,
  },
]

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; pincode?: string; product?: string; message?: string }> }) {
  const params = await searchParams
  const deliveryMessage = params.topic === "delivery" && params.message ? params.message : ""

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-20 size-96 rounded-full bg-[#c9a96e]/[0.06] blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white/65 transition hover:border-[#c9a96e]/50 hover:text-[#e5cb91]">
          <ArrowLeft size={16} /> Back to home
        </Link>

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-[#c9a96e]/20 bg-gradient-to-br from-[#c9a96e]/[0.12] via-[#151512] to-[#0b0b0a] px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div aria-hidden="true" className="absolute -right-10 -top-16 hidden size-72 rounded-full border border-[#c9a96e]/15 sm:block" />
          <div aria-hidden="true" className="absolute -right-1 -top-7 hidden size-52 rounded-full border border-[#c9a96e]/10 sm:block" />
          <div className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c9a96e]/25 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[#e5cb91]"><Sparkles size={13}/> Personal customer care</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Good service is <span className="text-[#d8bc88]">always in style.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">Questions about a product or an order? Reach out using whichever channel works best for you. We’ll help you find the right next step.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2"><ShieldCheck size={14} className="text-[#c9a96e]"/> Order assistance</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2"><Clock3 size={14} className="text-[#c9a96e]"/> Response times may vary</span>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div><p className="text-[10px] uppercase tracking-[0.28em] text-[#c9a96e]">Reach us directly</p><h2 className="mt-2 text-2xl font-semibold sm:text-3xl">How can we help?</h2></div>
            <p className="max-w-md text-sm leading-6 text-white/45">For order-related questions, include your order number so we can help you more efficiently.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {contactOptions.map(({ title, detail, description, href: originalHref, action, icon: Icon, external }, index) => {
              const href = title === "WhatsApp support" && deliveryMessage
                ? `https://wa.me/919909231028?text=${encodeURIComponent(deliveryMessage)}`
                : originalHref
              return (
              <a key={title} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="group relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#c9a96e]/45 hover:bg-[#c9a96e]/[0.045] hover:shadow-[0_16px_48px_rgba(0,0,0,0.2)] sm:p-6">
                <span className="absolute right-5 top-5 text-[10px] tracking-[0.2em] text-white/25">0{index + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-2xl border border-[#c9a96e]/25 bg-[#c9a96e]/[0.08] text-[#d8bc88] transition group-hover:bg-[#c9a96e]/[0.14]"><Icon size={21}/></span>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-[#d8bc88]">{detail}</p>
                <p className="mt-3 text-sm leading-6 text-white/50">{description}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-semibold text-white/70 transition group-hover:text-[#e5cb91]">{action}<ArrowUpRight size={14}/></span>
              </a>
              )
            })}
          </div>
        </section>

        <p className="mt-8 border-t border-white/[0.08] pt-5 text-xs leading-6 text-white/35">Timora customer care · Please never share passwords, OTPs, or full payment-card details in a support message.</p>
      </div>
    </main>
  )
}
