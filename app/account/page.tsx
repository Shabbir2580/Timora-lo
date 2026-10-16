"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowRight, BadgeCheck, Bell, ChevronRight, Gift, GitCompareArrows, Heart, LogOut, MapPin, Package, Pencil,
  RefreshCw, ShieldCheck, ShoppingBag, Truck,
} from "lucide-react"

type Address = {
  id: string; full_name: string; phone: string; address: string; landmark: string | null
  city: string; state: string; pincode: string; address_label: string; is_default: boolean
}
type Order = { id: string; order_status: string; payment_status: string; total_paise: number; created_at: string }

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100)
const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

export default function AccountPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [editing, setEditing] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { router.replace("/login?next=%2Faccount"); return }
    setEmail(user.email ?? "")
    setName(typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "")
    setPhone(typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "")
    const [addressResult, orderResult] = await Promise.all([
      supabase.from("addresses").select("id,full_name,phone,address,landmark,city,state,pincode,address_label,is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("orders").select("id,order_status,payment_status,total_paise,created_at").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
    ])
    if (addressResult.error) setError("Your profile loaded, but saved addresses could not be loaded.")
    else setAddresses((addressResult.data ?? []) as Address[])
    if (orderResult.error) setError((current) => current || "Your profile loaded, but recent orders could not be loaded.")
    else setOrders((orderResult.data ?? []) as Order[])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { void load() }, [load])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(""); setNotice("")
    const cleanName = name.trim()
    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanName.length < 2) { setError("Please enter your full name."); return }
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) { setError("Enter a valid 10-digit Indian mobile number."); return }
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: cleanName, phone: cleanPhone } })
    if (updateError) setError("We couldn't save your profile. Please try again.")
    else { setName(cleanName); setPhone(cleanPhone); setEditing(false); setNotice("Your profile details have been saved.") }
    setSaving(false)
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) { setError("Couldn't sign out. Please try again."); return }
    router.replace("/login"); router.refresh()
  }

  const initial = (name || email || "T").trim().charAt(0).toUpperCase()
  const shortcuts = [
    { href: "/orders", title: "Your orders", detail: "Track, return or view invoices", icon: Package },
    { href: "/addresses", title: "Manage addresses", detail: "Add, edit or choose a default address", icon: MapPin },
    { href: "/wishlist", title: "Your wishlist", detail: "Products you saved for later", icon: Heart },
    { href: "/rewards", title: "Rewards & referrals", detail: "Earn points and invite friends", icon: Gift },
    { href: "/notifications", title: "Notifications", detail: "Payment and order progress updates", icon: Bell },
    { href: "/compare", title: "Compare products", detail: "Review saved products side by side", icon: GitCompareArrows },
    { href: "/checkout", title: "Buy again", detail: "Find your next favourite", icon: ShoppingBag },
    { href: "/returns", title: "Returns & help", detail: "Get help with an order", icon: RefreshCw },
  ]

  if (loading) return <main className="min-h-[70vh] bg-[#0b0b0a] px-4 py-20 text-center text-sm text-white/60">Loading your Timora account…</main>

  return (
    <main className="min-h-screen bg-[#0b0b0a] px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a96e]">Your space, your style</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My account</h1><p className="mt-2 text-sm text-white/50">Manage your profile, orders and delivery details in one place.</p></div>
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-white/10 px-4 text-sm text-white/70 transition hover:border-[#c9a96e]/50 hover:text-[#e3ca96]">Continue shopping <ArrowRight className="size-4"/></Link>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p>}

        <section className="relative overflow-hidden rounded-3xl border border-[#c9a96e]/25 bg-gradient-to-br from-[#242016] via-[#15140f] to-[#10100e] p-5 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[#c9a96e]/10 blur-3xl"/>
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-[#d7bc80]/30 bg-[#c9a96e]/15 text-2xl font-semibold text-[#e3ca96]">{initial}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{name || "Welcome to Timora"}</h2><span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-200"><BadgeCheck className="size-3"/> Signed in</span></div><p className="mt-1 break-all text-sm text-white/55">{email}</p><p className="mt-1 text-xs text-white/35">Customer account · Timora</p></div>
            <button onClick={() => { setEditing(!editing); setError(""); setNotice("") }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c9a96e]/40 px-4 text-sm text-[#e3ca96] transition hover:bg-[#c9a96e]/10"><Pencil className="size-4"/>{editing ? "Close editor" : "Edit profile"}</button>
          </div>
          {editing && <form onSubmit={saveProfile} className="relative mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2"><label className="text-xs text-white/60">Full name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} required className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#c9a96e]"/></label><label className="text-xs text-white/60">Mobile number<input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="numeric" maxLength={14} placeholder="10-digit mobile number" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#c9a96e]"/></label><p className="text-xs text-white/35 sm:col-span-2">Email changes are not available here. Your email remains the account sign-in address.</p><div className="sm:col-span-2"><button disabled={saving} className="min-h-11 rounded-full bg-[#c9a96e] px-6 text-sm font-semibold text-[#17130c] disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></form>}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-xs text-white/45"><Package className="size-4 text-[#c9a96e]"/> Total orders</div><p className="mt-3 text-3xl font-semibold">{orders.length === 5 ? "5+" : orders.length}</p><Link href="/orders" className="mt-2 inline-flex items-center text-xs text-[#d8bc88]">View orders <ChevronRight className="size-3"/></Link></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-xs text-white/45"><Truck className="size-4 text-[#c9a96e]"/> In progress</div><p className="mt-3 text-3xl font-semibold">{orders.filter(o=>["confirmed","processing","shipped"].includes(o.order_status)).length}</p><p className="mt-2 text-xs text-white/35">Orders being prepared or delivered</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-xs text-white/45"><MapPin className="size-4 text-[#c9a96e]"/> Saved addresses</div><p className="mt-3 text-3xl font-semibold">{addresses.length}</p><p className="mt-2 text-xs text-white/35">Ready for faster checkout</p></div>
        </section>

        <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Quick links</h2><span className="text-xs text-white/35">Everything you need</span></div><div className="grid gap-3 sm:grid-cols-2">{shortcuts.map(({href,title,detail,icon:Icon})=><Link key={href} href={href} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-[#c9a96e]/40 hover:bg-[#c9a96e]/[0.05]"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#c9a96e]/10 text-[#d8bc88]"><Icon className="size-5"/></span><span className="min-w-0 flex-1"><span className="block font-medium">{title}</span><span className="mt-1 block text-xs text-white/45">{detail}</span></span><ChevronRight className="size-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#d8bc88]"/></Link>)}</div></section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Recent orders</h2><p className="mt-1 text-xs text-white/40">Your latest purchases at a glance</p></div><Link href="/orders" className="text-xs text-[#d8bc88] hover:text-white">See all</Link></div>
            {orders.length ? <div className="mt-4 divide-y divide-white/10">{orders.slice(0,4).map(order=><div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="font-mono text-xs text-white/65">#{order.id.slice(0,8).toUpperCase()}</p><p className="mt-1 text-xs text-white/35">{date(order.created_at)}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(order.total_paise)}</p><p className="mt-1 text-[10px] capitalize text-[#d8bc88]">{order.order_status.replace(/_/g," ")}</p></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center"><Package className="mx-auto size-7 text-white/25"/><p className="mt-2 text-sm text-white/60">No orders yet</p><Link href="/products" className="mt-3 inline-flex text-sm text-[#d8bc88]">Explore the collection <ArrowRight className="ml-1 size-4"/></Link></div>}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2"><MapPin className="size-5 text-[#c9a96e]"/><h2 className="font-semibold">Saved addresses</h2></div>{addresses.length ? <div className="mt-4 space-y-3">{addresses.slice(0,2).map(address=><div key={address.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-center gap-2"><span className="text-sm font-medium">{address.address_label || "Address"}</span>{address.is_default && <span className="rounded-full bg-[#c9a96e]/10 px-2 py-0.5 text-[9px] text-[#d8bc88]">Default</span>}</div><p className="mt-1 text-xs leading-5 text-white/50">{address.full_name} · {address.phone}<br/>{address.address}{address.landmark ? ", "+address.landmark : ""}, {address.city}, {address.state} {address.pincode}</p></div>)}</div> : <p className="mt-3 text-sm text-white/45">Save your first address during checkout for a faster next purchase.</p>}<Link href="/addresses" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#c9a96e]/30 px-4 text-xs text-[#d8bc88] hover:bg-[#c9a96e]/10"><MapPin className="size-3"/> Manage addresses</Link></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#c9a96e]"/><h2 className="font-semibold">Account & security</h2></div><p className="mt-2 text-xs leading-5 text-white/45">Your account is protected by Timora sign-in. Keep your contact details current for delivery updates.</p><Link href="/login" className="mt-3 inline-flex items-center gap-2 text-xs text-[#d8bc88]">Sign-in options <ArrowRight className="size-3"/></Link><button onClick={signOut} className="mt-4 flex min-h-10 w-full items-center gap-2 rounded-xl border border-red-300/20 px-3 text-sm text-red-200 transition hover:bg-red-400/10"><LogOut className="size-4"/> Sign out</button></div>
          </div>
        </section>
        <p className="mt-8 text-center text-[11px] text-white/25">Timora account · Your shopping details in one place.</p>
      </div>
    </main>
  )
}
