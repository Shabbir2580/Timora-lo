"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, LogOut, Plus, RefreshCw, Ticket, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Coupon = { id: string; code: string; discount_type: "percent" | "fixed"; discount_value: number; minimum_order_paise: number; max_discount_paise: number | null; usage_limit: number | null; usage_count: number; starts_at: string | null; expires_at: string | null; is_active: boolean; created_at: string }
type FormState = { code: string; discount_type: "percent" | "fixed"; discount_value: string; minimum_rupees: string; max_discount_rupees: string; usage_limit: string; starts_at: string; expires_at: string; is_active: boolean }
const blank: FormState = { code: "", discount_type: "percent", discount_value: "10", minimum_rupees: "0", max_discount_rupees: "", usage_limit: "", starts_at: "", expires_at: "", is_active: true }
const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100)
const localInputDate = (value: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function AdminCouponsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(blank)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadCoupons = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase.from("coupons").select("id,code,discount_type,discount_value,minimum_order_paise,max_discount_paise,usage_limit,usage_count,starts_at,expires_at,is_active,created_at").order("created_at", { ascending: false })
      if (queryError) throw queryError
      setCoupons((data ?? []) as Coupon[])
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load coupons.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    async function verify() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace("/login?next=%2Fadmin%2Fcoupons"); return }
        const { data: staff, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staff || staff.role !== "admin") { router.replace("/"); return }
        if (active) { setAuthorized(true); await loadCoupons() }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Could not verify admin access.") }
      finally { if (active) setChecking(false) }
    }
    void verify()
    return () => { active = false }
  }, [router, loadCoupons])

  function edit(coupon: Coupon) {
    setEditingId(coupon.id)
    setForm({ code: coupon.code, discount_type: coupon.discount_type, discount_value: String(coupon.discount_type === "fixed" ? coupon.discount_value / 100 : coupon.discount_value), minimum_rupees: String(coupon.minimum_order_paise / 100), max_discount_rupees: coupon.max_discount_paise == null ? "" : String(coupon.max_discount_paise / 100), usage_limit: coupon.usage_limit == null ? "" : String(coupon.usage_limit), starts_at: localInputDate(coupon.starts_at), expires_at: localInputDate(coupon.expires_at), is_active: coupon.is_active })
    setFormOpen(true); setError(""); setNotice("")
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("")
    const numeric = Number(form.discount_value)
    const minimum = Number(form.minimum_rupees || 0)
    const maximum = form.max_discount_rupees.trim() ? Number(form.max_discount_rupees) : null
    const limit = form.usage_limit.trim() ? Number(form.usage_limit) : null
    if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isFinite(minimum) || minimum < 0 || (maximum !== null && (!Number.isFinite(maximum) || maximum <= 0)) || (limit !== null && (!Number.isInteger(limit) || limit <= 0))) {
      setError("Check the discount, minimum order, maximum discount and usage limit values."); setSaving(false); return
    }
    if (form.discount_type === "percent" && numeric >= 100) { setError("Percentage discount must be less than 100% so an order total cannot be reduced to zero."); setSaving(false); return }
    const payload = { code: form.code.trim().toUpperCase(), discount_type: form.discount_type, discount_value: form.discount_type === "fixed" ? Math.round(numeric * 100) : numeric, minimum_order_paise: Math.round(minimum * 100), max_discount_paise: maximum === null ? null : Math.round(maximum * 100), usage_limit: limit, starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null, is_active: form.is_active }
    if (!/^[A-Z0-9_-]{3,40}$/.test(payload.code)) { setError("Use 3–40 letters, numbers, hyphens or underscores for the code."); setSaving(false); return }
    if (form.starts_at && form.expires_at && new Date(form.expires_at) <= new Date(form.starts_at)) { setError("Expiry must be after the start date."); setSaving(false); return }
    try {
      const supabase = createClient()
      const result = editingId ? await supabase.from("coupons").update(payload).eq("id", editingId) : await supabase.from("coupons").insert(payload)
      if (result.error) throw result.error
      setNotice(editingId ? "Coupon updated." : "Coupon created.")
      setFormOpen(false); setEditingId(null); setForm(blank)
      await loadCoupons()
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the coupon.") }
    finally { setSaving(false) }
  }

  async function toggleActive(coupon: Coupon) {
    setError(""); setNotice("")
    try { const supabase = createClient(); const { error: updateError } = await supabase.from("coupons").update({ is_active: !coupon.is_active }).eq("id", coupon.id); if (updateError) throw updateError; setNotice(`${coupon.code} ${coupon.is_active ? "disabled" : "enabled"}.`); await loadCoupons() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update coupon.") }
  }

  async function remove(coupon: Coupon) {
    if (coupon.usage_count > 0) { setError("This coupon has already been used. Disable it instead of deleting it so order history remains understandable."); return }
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return
    try { const supabase = createClient(); const { error: deleteError } = await supabase.from("coupons").delete().eq("id", coupon.id); if (deleteError) throw deleteError; setNotice("Coupon deleted."); await loadCoupons() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete coupon.") }
  }

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.replace("/login"); router.refresh() }
  if (checking) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]">Checking admin access…</main>
  if (!authorized) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] p-6 text-white"><div className="text-center"><h1 className="text-xl font-semibold">Admin access required</h1><Link href="/" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 text-sm">Return to store</Link></div></main>

  return <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]"><header className="sticky top-0 z-20 border-b border-[#d4af37]/20 bg-[#0b0b0a]/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><Link href="/admin" aria-label="Back to products" className="grid size-10 place-items-center rounded-full border border-white/10"><ArrowLeft className="size-4"/></Link><div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Promotion management</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void loadCoupons()} disabled={loading} aria-label="Refresh coupons" className="grid size-10 place-items-center rounded-full border border-white/10"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`}/></button><button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70"><LogOut className="size-4"/><span className="hidden sm:inline">Sign out</span></button></div></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Offers & discounts</p><h1 className="mt-2 text-3xl font-medium sm:text-4xl">Coupons</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Create percent or fixed discounts, minimum order amounts, usage limits and date windows. Coupon checks happen on the server at checkout.</p></div><button type="button" onClick={() => { setForm(blank); setEditingId(null); setFormOpen((open) => !open); setError(""); setNotice("") }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c]"><Plus className="size-4"/>New coupon</button></div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-300/25 bg-red-300/5 p-3 text-sm text-red-200">{error}</p>}{notice && <p role="status" className="mt-5 rounded-lg border border-emerald-300/25 bg-emerald-300/5 p-3 text-sm text-emerald-200">{notice}</p>}
      {formOpen && <form onSubmit={save} className="mt-6 rounded-2xl border border-[#d4af37]/25 bg-[#11110f] p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? "Edit coupon" : "Create coupon"}</h2><button type="button" onClick={() => { setFormOpen(false); setEditingId(null) }} className="text-xs text-white/50 hover:text-white">Close</button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-white/60">Code<input required minLength={3} maxLength={40} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="WELCOME10" className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>
        <label className="text-xs text-white/60">Discount type<select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></label>
        <label className="text-xs text-white/60">{form.discount_type === "percent" ? "Discount percentage" : "Discount amount (₹)"}<input type="number" min="0.01" max={form.discount_type === "percent" ? 99.99 : undefined} step="0.01" required value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>
        <label className="text-xs text-white/60">Minimum order (₹)<input type="number" min="0" step="0.01" value={form.minimum_rupees} onChange={(e) => setForm({ ...form, minimum_rupees: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>
        {form.discount_type === "percent" && <label className="text-xs text-white/60">Maximum discount (₹, optional)<input type="number" min="0.01" step="0.01" value={form.max_discount_rupees} onChange={(e) => setForm({ ...form, max_discount_rupees: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>}
        <label className="text-xs text-white/60">Usage limit (blank = unlimited)<input type="number" min="1" step="1" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>
        <label className="text-xs text-white/60">Starts at (optional)<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>
        <label className="text-xs text-white/60">Expires at (optional)<input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#d4af37]"/></label>
        <label className="flex items-center gap-3 self-end rounded-lg border border-white/10 p-3 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#d4af37]"/>Active immediately</label>
      </div><p className="mt-4 text-xs leading-5 text-white/40">Fixed discount values are stored as paise internally. Existing usage count is preserved when editing. Disable a used coupon rather than deleting it.</p><div className="mt-5 flex justify-end"><button disabled={saving} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] disabled:opacity-50"><Check className="size-4"/>{saving ? "Saving…" : "Save coupon"}</button></div></form>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">{loading && !coupons.length ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading coupons…</p> : coupons.length ? coupons.map((coupon) => <article key={coupon.id} className="rounded-2xl border border-white/10 bg-[#11110f] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-lg font-semibold tracking-wider text-[#e4c878]">{coupon.code}</p><p className="mt-1 text-sm text-white/70">{coupon.discount_type === "percent" ? `${coupon.discount_value}% off` : `${rupees(Number(coupon.discount_value) / 100)} off`}</p><p className="mt-2 text-xs text-white/45">Minimum {rupees(coupon.minimum_order_paise)} · Used {coupon.usage_count}{coupon.usage_limit == null ? " / ∞" : ` / ${coupon.usage_limit}`}</p><p className="mt-1 text-xs text-white/35">{coupon.starts_at ? new Date(coupon.starts_at).toLocaleString("en-IN") : "No start date"} — {coupon.expires_at ? new Date(coupon.expires_at).toLocaleString("en-IN") : "No expiry"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] ${coupon.is_active ? "bg-emerald-300/10 text-emerald-200" : "bg-white/5 text-white/45"}`}>{coupon.is_active ? "Active" : "Disabled"}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => edit(coupon)} className="min-h-9 rounded-full border border-white/15 px-3 text-xs text-white/70">Edit</button><button type="button" onClick={() => void toggleActive(coupon)} className="min-h-9 rounded-full border border-[#d4af37]/25 px-3 text-xs text-[#e4c878]">{coupon.is_active ? "Disable" : "Enable"}</button><button type="button" onClick={() => void remove(coupon)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-red-300/20 px-3 text-xs text-red-200"><Trash2 className="size-3.5"/>Delete</button></div></article>) : <div className="col-span-full rounded-xl border border-dashed border-white/15 p-10 text-center"><Ticket className="mx-auto size-8 text-[#d4af37]/60"/><p className="mt-3 text-sm text-white/65">No coupons created yet</p><p className="mt-1 text-xs text-white/40">Create your first promotion to enable server-validated discounts.</p></div>}</div>
    </div>
  </main>
}
