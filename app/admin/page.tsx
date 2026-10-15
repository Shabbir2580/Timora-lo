"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity, ArrowRight, BadgePercent, Boxes, CheckCircle2, ChevronRight, Clock3,
  LayoutDashboard, LogOut, Package, RefreshCw, ShieldCheck,
  ShoppingBag, Star, Users, Wallet, AlertTriangle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "admin" | "employee"
type OrderRow = {
  id: string
  customer_name: string
  total_paise: number
  order_status: string
  payment_status: string
  payment_provider: string | null
  created_at: string
  payment_verified_at?: string | null
  cod_collected_at?: string | null
}
type ProductRow = { id: string; name: string; stock: number; price: number; is_active: boolean }

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(paise || 0) / 100)

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))

const statusTone: Record<string, string> = {
  pending_payment: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  confirmed: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  processing: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  shipped: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  delivered: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  cancelled: "border-red-300/20 bg-red-300/10 text-red-200",
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase()
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [metrics, setMetrics] = useState({
    orders: 0, pending: 0, products: 0, activeProducts: 0,
    customers: 0, reviews: 0, coupons: 0, employees: 0, revenue: 0,
    monthlyRevenue: 0, previousMonthRevenue: 0, paidOrders: 0, monthlyOrders: 0,
  })
  const [salesTrend, setSalesTrend] = useState<{ label: string; revenue: number }[]>([])

  const loadDashboard = useCallback(async (currentRole: Role) => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const [
        allOrders, pendingOrders, allProducts, activeProducts, customerRows,
        reviewRows, recentOrders, productRows,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending_payment"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("customer_id"),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id,customer_name,total_paise,order_status,payment_status,payment_provider,created_at").order("created_at", { ascending: false }).limit(7),
        supabase.from("products").select("id,name,stock,price,is_active").order("stock", { ascending: true }).limit(100),
      ])

      const failed = [allOrders, pendingOrders, allProducts, activeProducts, customerRows, reviewRows, recentOrders, productRows].find((result) => result.error)
      if (failed?.error) throw failed.error

      const recent = (recentOrders.data ?? []) as OrderRow[]
      const productList = (productRows.data ?? []) as ProductRow[]
      const customerIds = new Set((customerRows.data ?? []).map((row) => row.customer_id).filter(Boolean))
      // Owner-only financial and staff metrics are not queried for employees.
      let paidRevenue = 0
      let monthlyRevenue = 0
      let previousMonthRevenue = 0
      let paidOrders = 0
      let monthlyOrders = 0
      let coupons = 0
      let employees = 0
      if (currentRole === "admin") {
        const [paidRows, couponCount, staffRows] = await Promise.all([
          supabase.from("orders").select("total_paise,order_status,payment_provider,payment_verified_at,cod_collected_at,created_at").eq("payment_status", "paid"),
          supabase.from("coupons").select("id", { count: "exact", head: true }),
          supabase.from("staff_roles").select("user_id,role"),
        ])
        if (paidRows.error) throw paidRows.error
        if (couponCount.error) throw couponCount.error
        if (staffRows.error) throw staffRows.error
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const paid = (paidRows.data ?? []).filter((row) => row.order_status !== "cancelled")
        const collectedAt = (row: { payment_provider: string | null; payment_verified_at: string | null; cod_collected_at: string | null }) => row.payment_provider === "cod" ? row.cod_collected_at : row.payment_verified_at
        paidRevenue = paid.reduce((sum, row) => sum + Number(row.total_paise || 0), 0)
        monthlyRevenue = paid.reduce((sum, row) => { const stamp = collectedAt(row); return stamp && new Date(stamp) >= monthStart && new Date(stamp) <= now ? sum + Number(row.total_paise || 0) : sum }, 0)
        previousMonthRevenue = paid.reduce((sum, row) => { const stamp = collectedAt(row); return stamp && new Date(stamp) >= previousMonthStart && new Date(stamp) < monthStart ? sum + Number(row.total_paise || 0) : sum }, 0)
        paidOrders = paid.length
        monthlyOrders = paid.filter((row) => { const stamp = collectedAt(row); return stamp && new Date(stamp) >= monthStart && new Date(stamp) <= now }).length
        setSalesTrend(Array.from({ length: 6 }, (_, index) => {
          const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
          const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1)
          const revenue = paid.reduce((sum, row) => { const stamp = collectedAt(row); const date = stamp ? new Date(stamp) : null; return date && date >= month && date < nextMonth ? sum + Number(row.total_paise || 0) : sum }, 0)
          return { label: month.toLocaleDateString("en-IN", { month: "short" }), revenue }
        }))
        coupons = couponCount.count ?? 0
        employees = (staffRows.data ?? []).filter((staff) => staff.role === "employee").length
      }

      setOrders(recent)
      setProducts(productList)
      setMetrics({
        orders: allOrders.count ?? 0,
        pending: pendingOrders.count ?? 0,
        products: allProducts.count ?? 0,
        activeProducts: activeProducts.count ?? 0,
        customers: customerIds.size,
        reviews: reviewRows.count ?? 0,
        coupons,
        employees,
        revenue: paidRevenue,
        monthlyRevenue,
        previousMonthRevenue,
        paidOrders,
        monthlyOrders,
      })
    } catch (err) {
      setError(err instanceof Error ? `Could not load dashboard data: ${err.message}` : "Could not load dashboard data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function verify() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.replace("/login?next=%2Fadmin")
          return
        }
        const { data: staff, error: roleError } = await supabase
          .from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staff || !["admin", "employee"].includes(staff.role)) {
          router.replace("/")
          return
        }
        if (active) {
          const currentRole = staff.role as Role
          setRole(currentRole)
          await loadDashboard(currentRole)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not verify staff access.")
      } finally {
        if (active) setChecking(false)
      }
    }
    void verify()
    return () => { active = false }
  }, [router, loadDashboard])

  const lowStock = useMemo(() => products.filter((product) => product.is_active && product.stock <= 5), [products])
  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  if (checking) return (
    <main className="grid min-h-screen place-items-center bg-[#090a0b] text-[#d9b65d]">
      <div className="flex items-center gap-3 text-sm"><RefreshCw className="size-4 animate-spin" /> Securing your workspace…</div>
    </main>
  )

  if (!role) return (
    <main className="grid min-h-screen place-items-center bg-[#090a0b] px-5 text-white">
      <div className="max-w-sm text-center"><ShieldCheck className="mx-auto size-10 text-[#d9b65d]" /><h1 className="mt-4 text-xl font-semibold">Staff access required</h1><p className="mt-2 text-sm text-white/50">Sign in with an authorized Timora staff account.</p>{error && <p className="mt-4 text-sm text-red-300">{error}</p>}<Link href="/" className="mt-5 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm">Return to store</Link></div>
    </main>
  )

  const metricCards = [
    { label: "Total orders", value: metrics.orders.toLocaleString("en-IN"), hint: `${metrics.pending} awaiting payment`, icon: ShoppingBag, color: "text-sky-300", tint: "bg-sky-300/10" },
    ...(role === "admin" ? [
      { label: "Monthly income", value: money(metrics.monthlyRevenue), hint: `${metrics.monthlyOrders} payments collected this month`, icon: Wallet, color: "text-emerald-300", tint: "bg-emerald-300/10" },
      { label: "Lifetime paid sales", value: money(metrics.revenue), hint: `${metrics.paidOrders} paid orders · cancelled orders excluded`, icon: Activity, color: "text-sky-300", tint: "bg-sky-300/10" },
    ] : []),
    { label: "Live products", value: metrics.activeProducts.toLocaleString("en-IN"), hint: `${metrics.products} products in catalogue`, icon: Package, color: "text-[#d9b65d]", tint: "bg-[#d9b65d]/10" },
    { label: "Customer reviews", value: metrics.reviews.toLocaleString("en-IN"), hint: "All submitted reviews", icon: Star, color: "text-violet-300", tint: "bg-violet-300/10" },
  ]

  const shortcuts = [
    { title: "Order management", desc: "Payments, COD approvals, fulfilment and tracking", href: "/admin/orders", icon: ShoppingBag, adminOnly: false, tag: metrics.pending ? `${metrics.pending} pending` : "Up to date" },
    { title: "Products & inventory", desc: "Edit listings, prices, stock and visibility", href: "/admin/products", icon: Boxes, adminOnly: false, tag: `${lowStock.length} low stock` },
    { title: "Reviews & ratings", desc: "Review submissions and moderation", href: "/admin/reviews", icon: Star, adminOnly: false, tag: "Moderation" },
    { title: "Coupons & offers", desc: "Discounts, expiry dates and usage limits", href: "/admin/coupons", icon: BadgePercent, adminOnly: true, tag: `${metrics.coupons} coupons` },
    { title: "Employee access", desc: "Authorize staff and manage roles", href: "/admin/employees", icon: Users, adminOnly: true, tag: `${metrics.employees} employees` },
  ].filter((item) => role === "admin" || !item.adminOnly)

  return (
    <main className="min-h-screen bg-[#090a0b] text-[#f6f5f0]"><style jsx global>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; } }`}</style>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/[0.07] bg-[#0c0d0e] xl:flex">
        <Link href="/" className="flex h-[88px] items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="grid size-10 place-items-center rounded-xl border border-[#d9b65d]/30 bg-[#d9b65d]/[0.08]"><span className="font-serif text-xl text-[#d9b65d]">T</span></div>
          <div><p className="text-lg font-semibold tracking-[0.2em]">TIMORA<span className="text-[#d9b65d]">.</span></p><p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Commerce console</p></div>
        </Link>
        <div className="px-4 pt-6"><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Workspace</p><div className="mt-3 flex items-center gap-3 rounded-xl border border-[#d9b65d]/20 bg-[#d9b65d]/[0.08] px-3 py-3 text-sm text-[#ead49b]"><LayoutDashboard className="size-4" /> Overview <span className="ml-auto size-1.5 rounded-full bg-[#d9b65d]" /></div></div>
        <nav className="mt-3 flex-1 space-y-1 px-4">
          {shortcuts.map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/55 transition hover:bg-white/[0.05] hover:text-white"><item.icon className="size-4 text-white/40 group-hover:text-[#d9b65d]" />{item.title}<ChevronRight className="ml-auto size-3.5 opacity-30" /></Link>)}
        </nav>
        <div className="m-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400" /><span className="text-xs font-medium text-white/70">Signed in securely</span></div><p className="mt-2 text-[11px] text-white/35">Access level: {role === "admin" ? "Administrator" : "Employee"}</p><button onClick={signOut} className="mt-4 flex min-h-9 w-full items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/55 hover:text-white"><LogOut className="size-3.5" /> Sign out</button></div>
      </aside>

      <div className="xl:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#090a0b]/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] xl:hidden"><span className="font-serif text-lg text-[#d9b65d]">T</span></div><div><p className="text-xs text-white/35">Timora / Workspace</p><h1 className="mt-0.5 text-lg font-semibold tracking-tight sm:text-xl">{role === "admin" ? "Business overview" : "Team workspace"}</h1></div></div>
            <div className="flex items-center gap-2 sm:gap-3"><span className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] text-emerald-200 sm:inline-flex"><span className="mr-2 mt-1 size-1.5 rounded-full bg-emerald-300" />Workspace active</span><button onClick={() => role && void loadDashboard(role)} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-white/65 transition hover:border-[#d9b65d]/40 hover:text-white disabled:opacity-50"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span></button><button onClick={signOut} aria-label="Sign out" className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-white xl:hidden"><LogOut className="size-4" /></button><div className="hidden size-10 place-items-center rounded-full border border-[#d9b65d]/30 bg-[#d9b65d]/10 text-sm font-semibold text-[#e8d39b] sm:grid">{role === "admin" ? "A" : "E"}</div></div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          <section className="animate-in relative overflow-hidden rounded-2xl border border-[#d9b65d]/20 bg-[radial-gradient(ellipse_at_top_right,rgba(217,182,93,0.13),transparent_48%),linear-gradient(120deg,#151513,#101112_60%,#12110d)] p-5 sm:p-8 lg:p-9">
            <div className="pointer-events-none absolute -right-12 -top-20 size-64 animate-pulse rounded-full border border-[#d9b65d]/20 sm:size-80" /><div className="pointer-events-none absolute -right-2 -top-10 size-48 rounded-full border border-[#d9b65d]/10 sm:size-64" />
            <div className="relative max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-[#d9b65d]/25 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#e5cd8c]"><ShieldCheck className="size-3.5" /> {role === "admin" ? "Administrator workspace" : "Employee workspace"}</div><h2 className="mt-5 max-w-xl text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-[42px]">{role === "admin" ? <>Your store, <span className="font-serif italic text-[#d9b65d]">at a glance.</span></> : <>Make every order <span className="font-serif italic text-[#d9b65d]">feel effortless.</span></>}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/50">Monitor the essentials, catch issues early, and move orders from checkout to delivery—all from one calm, focused workspace.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d9b65d] px-4 text-sm font-semibold text-[#17140b] transition hover:bg-[#ead49b]">Open orders <ArrowRight className="size-4" /></Link>{role === "admin" && <Link href="/admin/products" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/15 px-4 text-sm text-white/80 transition hover:border-[#d9b65d]/40">Manage catalogue <Package className="size-4" /></Link>}</div></div>
          </section>

          {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.07] p-4 text-sm text-red-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}

          <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {metricCards.map((metric) => <article key={metric.label} className="rounded-2xl border border-white/[0.08] bg-[#101112] p-5 transition hover:border-white/[0.14]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-white/45">{metric.label}</p><p className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px]">{metric.value}</p></div><div className={`grid size-11 place-items-center rounded-xl ${metric.tint} ${metric.color}`}><metric.icon className="size-5" /></div></div><p className="mt-3 text-[11px] text-white/35">{metric.hint}</p></article>)}
          </section>

          {role === "admin" && <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-300/15 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.09),transparent_45%),#101112] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Owner insights</p><h2 className="mt-2 text-xl font-semibold">Sales performance</h2><p className="mt-1 text-xs text-white/40">Recorded payments by collection month · cancelled orders excluded</p></div><div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3"><p className="text-[10px] text-white/45">This month</p><p className="mt-1 text-xl font-semibold text-emerald-200">{money(metrics.monthlyRevenue)}</p><p className="mt-1 text-[10px] text-white/40">{metrics.monthlyOrders} payment(s) collected</p></div></div>
            <div className="mt-6 grid grid-cols-6 items-end gap-2 sm:gap-4">{salesTrend.map((month, index) => { const peak = Math.max(...salesTrend.map((item) => item.revenue), 1); const height = Math.max(8, Math.round((month.revenue / peak) * 100)); const current = index === salesTrend.length - 1; return <div key={`${month.label}-${index}`} className="group flex min-w-0 flex-col items-center gap-2"><span className="text-center text-[9px] text-white/35 sm:text-[10px]">{month.revenue ? money(month.revenue) : "—"}</span><div className="flex h-28 w-full items-end overflow-hidden rounded-t-lg bg-white/[0.035] sm:h-36"><div title={`${month.label}: ${money(month.revenue)}`} className={`w-full origin-bottom rounded-t-lg transition-all duration-700 ease-out group-hover:brightness-125 ${current ? "bg-gradient-to-t from-emerald-500/70 to-emerald-200" : "bg-gradient-to-t from-[#a58b47]/55 to-[#e4cc8d]/80"}`} style={{ height: `${height}%`, animation: "fadeInUp .6s ease-out both", animationDelay: `${index * 80}ms` }} /></div><span className={`text-[10px] ${current ? "font-semibold text-emerald-200" : "text-white/40"}`}>{month.label}</span></div> })}</div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs"><span className="rounded-lg border border-white/[0.08] px-3 py-2 text-white/55">Previous month <strong className="ml-1 text-white/85">{money(metrics.previousMonthRevenue)}</strong></span><span className="rounded-lg border border-white/[0.08] px-3 py-2 text-white/55">Average paid order <strong className="ml-1 text-white/85">{money(metrics.paidOrders ? metrics.revenue / metrics.paidOrders : 0)}</strong></span></div>
          </section>}

          <section className="mt-8 grid gap-6 2xl:grid-cols-[1.45fr_0.85fr]">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101112]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-6"><div><h2 className="font-semibold">Recent orders</h2><p className="mt-1 text-xs text-white/35">Latest activity across your store</p></div><Link href="/admin/orders" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-[#e4cc8d] hover:bg-white/[0.04]">All orders <ArrowRight className="size-3.5" /></Link></div>
              {orders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.13em] text-white/30"><th className="px-5 py-3 font-medium sm:px-6">Order</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium sm:px-6">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.02]"><td className="px-5 py-4 sm:px-6"><p className="text-xs font-semibold">#{shortId(order.id)}</p><p className="mt-1 text-[10px] text-white/30">{dateLabel(order.created_at)}</p></td><td className="max-w-[150px] truncate px-3 py-4 text-xs text-white/65">{order.customer_name}</td><td className="whitespace-nowrap px-3 py-4 text-xs font-medium">{money(order.total_paise)}</td><td className="px-5 py-4 sm:px-6"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${statusTone[order.order_status] ?? "border-white/10 bg-white/5 text-white/60"}`}>{order.order_status.replace(/_/g, " ")}</span></td></tr>)}</tbody></table></div> : <div className="px-6 py-12 text-center"><ShoppingBag className="mx-auto size-7 text-white/20" /><p className="mt-3 text-sm text-white/55">No orders to show yet</p><p className="mt-1 text-xs text-white/30">New orders will appear here when customers check out.</p></div>}
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-white/[0.08] bg-[#101112] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Needs attention</h2><p className="mt-1 text-xs text-white/35">Items worth checking today</p></div><Activity className="size-5 text-[#d9b65d]" /></div><div className="mt-5 space-y-3"><Link href="/admin/orders" className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3.5 transition hover:border-amber-300/20 hover:bg-white/[0.02]"><div className="grid size-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Clock3 className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">Orders awaiting payment</p><p className="mt-1 text-[11px] text-white/35">Review pending orders and COD requests</p></div><span className="text-lg font-semibold">{metrics.pending}</span></Link><Link href="/admin/products" className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3.5 transition hover:border-red-300/20 hover:bg-white/[0.02]"><div className="grid size-10 place-items-center rounded-xl bg-red-300/10 text-red-200"><AlertTriangle className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">Low stock products</p><p className="mt-1 text-[11px] text-white/35">Active products with 5 units or fewer</p></div><span className="text-lg font-semibold">{lowStock.length}</span></Link><Link href="/admin/reviews" className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3.5 transition hover:border-violet-300/20 hover:bg-white/[0.02]"><div className="grid size-10 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><Star className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">Review moderation</p><p className="mt-1 text-[11px] text-white/35">Check submitted customer feedback</p></div><span className="text-lg font-semibold">{metrics.reviews}</span></Link></div></section>

              {role === "admin" && <section className="rounded-2xl border border-white/[0.08] bg-[#101112] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Inventory watch</h2><p className="mt-1 text-xs text-white/35">Lowest-stock active listings</p></div><Boxes className="size-5 text-[#d9b65d]" /></div>{lowStock.length ? <div className="mt-4 space-y-3">{lowStock.slice(0, 4).map((product) => <div key={product.id} className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-white/[0.04]"><Package className="size-4 text-white/45" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{product.name}</p><p className="mt-1 text-[10px] text-white/30">{money(Math.round(product.price * 100))} each</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${product.stock === 0 ? "bg-red-300/10 text-red-200" : "bg-amber-300/10 text-amber-200"}`}>{product.stock} left</span></div>)}</div> : <div className="py-6 text-center"><CheckCircle2 className="mx-auto size-6 text-emerald-300/70" /><p className="mt-2 text-xs text-white/45">No low-stock alerts in the loaded catalogue.</p></div>}<Link href="/admin/products" className="mt-5 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs text-white/65 hover:border-[#d9b65d]/35 hover:text-white">View inventory <ArrowRight className="size-3.5" /></Link></section>}
            </div>
          </section>

          <section className="mt-8"><div className="mb-4"><h2 className="text-lg font-semibold">Quick access</h2><p className="mt-1 text-xs text-white/35">Jump directly into your day-to-day tasks</p></div><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{shortcuts.map((item) => <Link key={item.href} href={item.href} style={{ animationDelay: `${shortcuts.indexOf(item) * 70}ms` }} className="group flex min-h-[126px] animate-[fadeInUp_.55s_ease-out_both] items-start gap-4 rounded-2xl border border-white/[0.08] bg-[#101112] p-5 transition hover:-translate-y-0.5 hover:border-[#d9b65d]/25 hover:bg-[#131411]"><div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-[#d9b65d] transition group-hover:border-[#d9b65d]/20 group-hover:bg-[#d9b65d]/[0.08]"><item.icon className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><span className="rounded-full bg-white/[0.05] px-2 py-1 text-[9px] text-white/40">{item.tag}</span></div><p className="mt-2 text-xs leading-5 text-white/40">{item.desc}</p><span className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#e4cc8d]">Open section <ChevronRight className="size-3 transition group-hover:translate-x-0.5" /></span></div></Link>)}</div></section>
          <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.07] py-6 text-[10px] text-white/25 sm:flex-row sm:items-center sm:justify-between"><p>Timora Commerce Console · {role === "admin" ? "Administrator" : "Employee"} access</p><p>Metrics reflect records currently available to your account.</p></footer>
        </div>
      </div>
    </main>
  )
}
