"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, LoaderCircle, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "admin" | "employee"
type OrderFinanceRow = {
  total_paise: number
  order_status: string
  payment_status: string
  payment_provider: string | null
  payment_verified_at: string | null
  cod_collected_at: string | null
}
type Expense = {
  id: string
  category: string
  amount_paise: number
  incurred_on: string
  description: string | null
  reference_code: string | null
  created_at: string
}
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100)
const localDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
const today = () => localDate(new Date())
const startOfMonth = () => { const d = new Date(); d.setDate(1); return localDate(d) }
const friendlyError = (error: unknown) => error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Something went wrong."

export default function FinanceReportsPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState("")
  const [canViewSales, setCanViewSales] = useState(false)
  const [canViewProfit, setCanViewProfit] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orders, setOrders] = useState<OrderFinanceRow[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [fromDate, setFromDate] = useState(startOfMonth)
  const [toDate, setToDate] = useState(today)
  const [category, setCategory] = useState("Marketing")
  const [amount, setAmount] = useState("")
  const [incurredOn, setIncurredOn] = useState(today)
  const [description, setDescription] = useState("")
  const [referenceCode, setReferenceCode] = useState("")

  const isAdmin = role === "admin"
  const canReadSales = isAdmin || canViewSales
  const canReadExpenses = isAdmin || canViewProfit

  const loadReports = useCallback(async () => {
    if (!canReadSales) return
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      // Page through all matching rows instead of silently truncating reports at
      // the PostgREST response cap.
      const pageSize = 500
      const orderRows: OrderFinanceRow[] = []
      for (let offset = 0; ; offset += pageSize) {
        const { data, error: orderError } = await supabase
          .from("orders")
          .select("total_paise,order_status,payment_status,payment_provider,payment_verified_at,cod_collected_at,created_at,id")
          .eq("payment_status", "paid")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1)
        if (orderError) throw orderError
        const page = (data ?? []) as OrderFinanceRow[]
        orderRows.push(...page)
        if (page.length < pageSize) break
      }
      setOrders(orderRows)
      if (canReadExpenses) {
        const expenseRows: Expense[] = []
        for (let offset = 0; ; offset += pageSize) {
          const { data, error: expenseError } = await supabase
            .from("business_expenses")
            .select("*")
            .order("incurred_on", { ascending: false })
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1)
          if (expenseError) throw expenseError
          const page = (data ?? []) as Expense[]
          expenseRows.push(...page)
          if (page.length < pageSize) break
        }
        setExpenses(expenseRows)
      } else setExpenses([])
    } catch (err) {
      setError(`Could not load finance reports. Confirm the business growth migration and financial permissions. ${friendlyError(err)}`)
    } finally {
      setLoading(false)
    }
  }, [canReadSales, canReadExpenses])

  useEffect(() => {
    let active = true
    async function verify() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.replace("/login?next=%2Fadmin%2Ffinance")
          return
        }
        const { data: staff, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staff || !["admin", "employee"].includes(staff.role)) {
          router.replace("/")
          return
        }
        let sales = staff.role === "admin"
        let profit = staff.role === "admin"
        if (staff.role === "employee") {
          const { data, error: permissionError } = await supabase.from("staff_permissions").select("view_sales_analytics,view_profit_analytics").eq("user_id", user.id).maybeSingle()
          if (permissionError) throw permissionError
          sales = Boolean(data?.view_sales_analytics)
          profit = Boolean(data?.view_profit_analytics)
        }
        if (!sales) {
          router.replace("/")
          return
        }
        if (!active) return
        setRole(staff.role as Role)
        setUserId(user.id)
        setCanViewSales(sales)
        setCanViewProfit(profit)
      } catch (err) {
        if (active) setError(`Could not verify finance access: ${friendlyError(err)}`)
      } finally {
        if (active) setChecking(false)
      }
    }
    void verify()
    return () => { active = false }
  }, [router])

  useEffect(() => {
    if (role && canReadSales) void loadReports()
  }, [role, canReadSales, canReadExpenses, loadReports])

  const eligibleOrders = useMemo(() => orders.filter((order) => {
    if (order.order_status === "cancelled") return false
    const collectedAt = order.payment_provider === "cod" ? order.cod_collected_at : order.payment_verified_at
    if (!collectedAt) return false
    const date = localDate(new Date(collectedAt))
    return date >= fromDate && date <= toDate
  }), [orders, fromDate, toDate])
  const collectedPaise = eligibleOrders.reduce((sum, order) => sum + Number(order.total_paise || 0), 0)
  const eligibleExpenses = expenses.filter((expense) => expense.incurred_on >= fromDate && expense.incurred_on <= toDate)
  const expensePaise = eligibleExpenses.reduce((sum, expense) => sum + Number(expense.amount_paise || 0), 0)

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAdmin) return
    const rupees = Number(amount)
    if (!Number.isFinite(rupees) || rupees <= 0 || !Number.isFinite(rupees * 100)) {
      setError("Enter a valid expense amount greater than zero.")
      return
    }
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from("business_expenses").insert({
        category: category.trim(),
        amount_paise: Math.round(rupees * 100),
        incurred_on: incurredOn,
        description: description.trim() || null,
        reference_code: referenceCode.trim() || null,
        recorded_by: userId,
      })
      if (insertError) throw insertError
      setAmount("")
      setDescription("")
      setReferenceCode("")
      setNotice("Expense recorded.")
      await loadReports()
    } catch (err) {
      setError(`Could not record expense: ${friendlyError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const header = ["Date", "Category", "Amount INR", "Description", "Reference"]
    const rows = eligibleExpenses.map((item) => [item.incurred_on, item.category, (Number(item.amount_paise) / 100).toFixed(2), item.description ?? "", item.reference_code ?? ""])
    const escape = (value: unknown) => {
      const raw = String(value ?? "")
      return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
    }
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `timora-expenses-${fromDate}-to-${toDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#090a0b] text-[#d9b65d]"><LoaderCircle className="size-6 animate-spin" /><span className="sr-only">Checking finance permissions</span></main>
  if (!role || !canReadSales) return <main className="grid min-h-screen place-items-center bg-[#090a0b] px-5 text-white"><div className="max-w-md text-center"><ShieldCheck className="mx-auto size-9 text-[#d9b65d]" /><h1 className="mt-3 text-xl font-semibold">Finance access unavailable</h1><p className="mt-2 text-sm text-white/55">{error || "An administrator must grant sales analytics access."}</p><Link href="/" className="mt-4 inline-block text-sm text-[#e4c878]">Return to store</Link></div></main>

  return <main className="min-h-screen bg-[#090a0b] text-[#f6f5f0]">
    <header className="sticky top-0 z-20 border-b border-[#d9b65d]/15 bg-[#090a0b]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><Link href="/admin" className="grid size-10 place-items-center rounded-full border border-white/10" aria-label="Back to dashboard"><ArrowLeft className="size-4" /></Link><div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d9b65d]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Business Console · Finance</p></div></div><button type="button" onClick={() => void loadReports()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d9b65d]/25 bg-[#d9b65d]/5 px-3 py-1.5 text-xs text-[#e4cc8d]"><Wallet className="size-4" />Financial reports</div><h1 className="text-3xl font-semibold sm:text-4xl">Collections & <span className="text-[#d9b65d]">expenses</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Collections use verified payment timestamps; placed orders and unpaid COD requests are not counted as collected revenue.</p></div><div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-white/45">From<input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#111] px-2 text-xs text-white" /></label><label className="text-[11px] text-white/45">To<input type="date" value={toDate} min={fromDate} max={today()} onChange={(e) => setToDate(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#111] px-2 text-xs text-white" /></label></div></div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-2xl border border-emerald-300/15 bg-white/[0.02] p-5"><p className="text-xs text-white/45">Verified collections</p><p className="mt-2 text-2xl font-semibold">{money(collectedPaise)}</p><p className="mt-2 text-[11px] text-white/35">{eligibleOrders.length} paid orders in selected period</p></div>{canReadExpenses && <div className="rounded-2xl border border-orange-300/15 bg-white/[0.02] p-5"><p className="text-xs text-white/45">Recorded expenses</p><p className="mt-2 text-2xl font-semibold">{money(expensePaise)}</p><p className="mt-2 text-[11px] text-white/35">{eligibleExpenses.length} expense records</p></div>}{canReadExpenses && <div className="rounded-2xl border border-[#d9b65d]/15 bg-white/[0.02] p-5"><p className="text-xs text-white/45">Collections less recorded expenses</p><p className="mt-2 text-2xl font-semibold">{money(collectedPaise - expensePaise)}</p><p className="mt-2 text-[11px] leading-5 text-amber-100/55">Not net profit: product costs, shipping, payment fees and other costs may be missing.</p></div>}</div>
      {isAdmin && <section className="mt-6 rounded-2xl border border-[#d9b65d]/20 bg-white/[0.025] p-5 sm:p-7"><h2 className="text-lg font-semibold">Record a business expense</h2><p className="mt-1 text-sm text-white/45">Only the admin can add or change expense records.</p><form onSubmit={addExpense} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><label className="block"><span className="mb-2 block text-xs text-white/55">Category</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm">{["Marketing","Shipping","Packaging","Payment fees","Supplier","Software","Returns / refunds","Other"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs text-white/55">Amount (₹)</span><input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-xs text-white/55">Date incurred</span><input type="date" required max={today()} value={incurredOn} onChange={(e) => setIncurredOn(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-xs text-white/55">Reference (optional)</span><input value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)} maxLength={120} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-xs text-white/55">Description (optional)</span><input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" /></label><button type="submit" disabled={saving || !amount} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#d9b65d] px-4 text-sm font-semibold text-black disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}Record expense</button></form></section>}
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"><div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold">Expense ledger</h2><p className="mt-1 text-xs text-white/40">Showing records within the selected date range.</p></div>{canReadExpenses && <button type="button" onClick={exportCsv} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/65"><Download className="size-3.5" />Export CSV</button>}</div>{!canReadExpenses ? <div className="p-8 text-center text-sm text-white/45">Your role can view verified collections. Expense and profit-related data requires a separate permission.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-white/[0.03] text-white/45"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Description</th><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 text-right font-medium">Amount</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{eligibleExpenses.map((expense) => <tr key={expense.id}><td className="px-4 py-3 text-white/65">{expense.incurred_on}</td><td className="px-4 py-3">{expense.category}</td><td className="px-4 py-3 text-white/55">{expense.description || "—"}</td><td className="px-4 py-3 text-white/40">{expense.reference_code || "—"}</td><td className="px-4 py-3 text-right font-medium">{money(Number(expense.amount_paise))}</td></tr>)}{eligibleExpenses.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-white/40">No expenses recorded in this period.</td></tr>}</tbody></table></div>}</section>
      <p className="mt-4 text-[11px] leading-5 text-white/35">All amounts are stored in paise. This report is operational bookkeeping, not a tax or accounting statement. Ensure expense entries are supported by records and reconciled before making business decisions.</p>
    </div>
  </main>
}
