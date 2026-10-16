"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Home, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Address = {
  id: string; user_id: string; full_name: string; phone: string; address: string
  landmark: string | null; city: string; state: string; pincode: string
  delivery_note: string | null; address_label: string; is_default: boolean
}
type AddressForm = {
  full_name: string; phone: string; address: string; landmark: string
  city: string; state: string; pincode: string; delivery_note: string; address_label: string
}
const blank: AddressForm = { full_name: "", phone: "", address: "", landmark: "", city: "", state: "", pincode: "", delivery_note: "", address_label: "Home" }
const input = "mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#11110f] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#c9a96e]"

export default function AddressesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState("")
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form, setForm] = useState<AddressForm>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [makeDefault, setMakeDefault] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workingId, setWorkingId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadAddresses = useCallback(async (id: string) => {
    const { data, error: queryError } = await supabase.from("addresses")
      .select("id,user_id,full_name,phone,address,landmark,city,state,pincode,delivery_note,address_label,is_default")
      .eq("user_id", id).order("is_default", { ascending: false }).order("created_at", { ascending: false })
    if (queryError) throw queryError
    setAddresses((data ?? []) as Address[])
  }, [supabase])

  useEffect(() => {
    let active = true
    async function init() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace("/login?next=%2Faddresses"); return }
        if (!active) return
        setUserId(user.id)
        await loadAddresses(user.id)
      } catch {
        if (active) setError("We couldn't load your saved addresses. Refresh and try again.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void init()
    return () => { active = false }
  }, [loadAddresses, router, supabase])

  function startAdd() {
    setEditingId(null)
    setForm(blank)
    setMakeDefault(addresses.length === 0)
    setFormOpen(true)
    setError(""); setNotice("")
  }
  function startEdit(address: Address) {
    setEditingId(address.id)
    setForm({ full_name: address.full_name, phone: address.phone, address: address.address, landmark: address.landmark ?? "", city: address.city, state: address.state, pincode: address.pincode, delivery_note: address.delivery_note ?? "", address_label: address.address_label || "Home" })
    setMakeDefault(address.is_default)
    setFormOpen(true); setError(""); setNotice("")
  }
  function change(field: keyof AddressForm, value: string) { setForm(previous => ({ ...previous, [field]: value })) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("")
    const phone = form.phone.replace(/\D/g, "")
    if (form.full_name.trim().length < 2) { setError("Enter the recipient's full name."); return }
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return }
    if (!/^\d{6}$/.test(form.pincode.trim())) { setError("Enter a valid 6-digit PIN code."); return }
    setSaving(true)
    try {
      const keepExistingDefault = Boolean(editingId && !makeDefault && addresses.some(address => address.id === editingId && address.is_default))
      const payload = {
        user_id: userId, full_name: form.full_name.trim(), phone, address: form.address.trim(),
        landmark: form.landmark.trim() || null, city: form.city.trim(), state: form.state.trim(),
        pincode: form.pincode.trim(), delivery_note: form.delivery_note.trim() || null,
        address_label: form.address_label, is_default: keepExistingDefault,
      }
      let savedAddressId = editingId
      if (editingId) {
        const { data, error: updateError } = await supabase.from("addresses")
          .update(payload).eq("id", editingId).eq("user_id", userId).select("id").single()
        if (updateError) throw updateError
        savedAddressId = data.id
      } else {
        const { data, error: insertError } = await supabase.from("addresses")
          .insert(payload).select("id").single()
        if (insertError) throw insertError
        savedAddressId = data.id
      }
      if (makeDefault || addresses.length === 0) {
        const { error: defaultError } = await supabase.rpc("set_customer_default_address", { p_address_id: savedAddressId })
        if (defaultError) throw defaultError
      }
      await loadAddresses(userId)
      setFormOpen(false); setNotice(editingId ? "Address updated successfully." : "Address saved successfully.")
    } catch (e) {
      console.error("Address save failed:", e)
      setError("We couldn't save this address. Please check your connection and try again.")
    } finally { setSaving(false) }
  }

  async function setDefault(address: Address) {
    if (address.is_default) return
    setWorkingId(address.id); setError(""); setNotice("")
    try {
      const { error: setError } = await supabase.rpc("set_customer_default_address", { p_address_id: address.id })
      if (setError) throw setError
      await loadAddresses(userId); setNotice("Default delivery address updated.")
    } catch {
      setError("We couldn't change your default address. Please try again.")
    } finally { setWorkingId("") }
  }

  async function remove(address: Address) {
    if (!window.confirm("Delete this saved address?")) return
    setWorkingId(address.id); setError(""); setNotice("")
    try {
      const { error: deleteError } = await supabase.rpc("delete_customer_address", { p_address_id: address.id })
      if (deleteError) throw deleteError
      await loadAddresses(userId)
      setNotice("Address deleted.")
    } catch {
      setError("We couldn't delete this address. Please try again.")
    } finally { setWorkingId("") }
  }

  if (loading) return <main className="min-h-[70vh] bg-[#0b0b0a] px-4 py-20 text-center text-sm text-white/60">Loading saved addresses…</main>

  return <main className="min-h-screen bg-[#0b0b0a] px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-[#dfc797]"><ArrowLeft className="size-4"/> My account</Link>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a96e]">Delivery made easier</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Your addresses</h1><p className="mt-2 text-sm text-white/45">Save multiple places and choose a default for faster checkout.</p></div>
        {!formOpen && <button onClick={startAdd} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#c9a96e] px-5 text-sm font-semibold text-[#17130c] transition hover:bg-[#dfc797]"><Plus className="size-4"/> Add address</button>}
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p>}

      {formOpen && <form onSubmit={save} className="mt-6 rounded-2xl border border-[#c9a96e]/25 bg-[#15140f] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{editingId ? "Edit address" : "Add a new address"}</h2><p className="mt-1 text-xs text-white/40">Fields marked * are required.</p></div><button type="button" aria-label="Close address form" onClick={()=>setFormOpen(false)} className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 hover:text-white"><X className="size-4"/></button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-white/60">Save address as *<select value={form.address_label} onChange={e=>change("address_label",e.target.value)} className={input}><option>Home</option><option>Office</option><option>Other</option></select></label>
          <label className="text-xs text-white/60">Recipient full name *<input required maxLength={120} value={form.full_name} onChange={e=>change("full_name",e.target.value)} className={input} placeholder="Name of recipient"/></label>
          <label className="text-xs text-white/60">Mobile number *<input required inputMode="numeric" maxLength={14} value={form.phone} onChange={e=>change("phone",e.target.value)} className={input} placeholder="10-digit Indian mobile"/></label>
          <label className="text-xs text-white/60 sm:col-span-2">Flat, house, building, street *<input required maxLength={300} value={form.address} onChange={e=>change("address",e.target.value)} className={input} placeholder="House number, street, area"/></label>
          <label className="text-xs text-white/60 sm:col-span-2">Landmark (optional)<input maxLength={200} value={form.landmark} onChange={e=>change("landmark",e.target.value)} className={input} placeholder="Nearby landmark"/></label>
          <label className="text-xs text-white/60">City *<input required maxLength={100} value={form.city} onChange={e=>change("city",e.target.value)} className={input}/></label>
          <label className="text-xs text-white/60">State *<input required maxLength={100} value={form.state} onChange={e=>change("state",e.target.value)} className={input}/></label>
          <label className="text-xs text-white/60">PIN code *<input required inputMode="numeric" maxLength={6} value={form.pincode} onChange={e=>change("pincode",e.target.value)} className={input} placeholder="6-digit PIN code"/></label>
          <label className="text-xs text-white/60">Delivery instructions (optional)<input maxLength={300} value={form.delivery_note} onChange={e=>change("delivery_note",e.target.value)} className={input} placeholder="Gate code, preferred time…"/></label>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-white/70"><input type="checkbox" checked={makeDefault} onChange={e=>setMakeDefault(e.target.checked)} className="mt-1 accent-[#c9a96e]"/><span>Set as my default delivery address<span className="mt-1 block text-xs text-white/35">You can change this any time.</span></span></label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={()=>setFormOpen(false)} className="min-h-11 rounded-full border border-white/15 px-5 text-sm text-white/70">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#c9a96e] px-6 text-sm font-semibold text-[#17130c] disabled:opacity-50">{saving ? "Saving…" : <><Check className="size-4"/> Save address</>}</button></div>
      </form>}

      {!addresses.length && !formOpen ? <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center"><MapPin className="mx-auto size-10 text-[#c9a96e]/70"/><h2 className="mt-4 text-lg font-semibold">No saved addresses yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">Add your home or office address once and use it for future Timora deliveries.</p><button onClick={startAdd} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c9a96e] px-5 text-sm font-semibold text-[#17130c]"><Plus className="size-4"/> Add your first address</button></div> :
      <div className="mt-6 grid gap-4 md:grid-cols-2">{addresses.map(address=><article key={address.id} className={`rounded-2xl border p-5 transition ${address.is_default ? "border-[#c9a96e]/50 bg-[#c9a96e]/[0.055]" : "border-white/10 bg-white/[0.025]"}`}>
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#c9a96e]/10 text-[#d8bc88]">{address.address_label === "Home" ? <Home className="size-5"/> : <MapPin className="size-5"/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{address.address_label || "Address"}</h2>{address.is_default && <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a96e]/15 px-2 py-1 text-[10px] text-[#dfc797]"><Star className="size-3"/> Default</span>}</div><p className="mt-2 text-sm font-medium">{address.full_name}</p><p className="mt-1 text-xs leading-5 text-white/50">{address.phone}<br/>{address.address}{address.landmark ? ", "+address.landmark : ""}<br/>{address.city}, {address.state} {address.pincode}{address.delivery_note ? <><br/>Note: {address.delivery_note}</> : null}</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">{!address.is_default && <button disabled={workingId===address.id} onClick={()=>void setDefault(address)} className="min-h-9 rounded-full border border-[#c9a96e]/30 px-3 text-xs text-[#dfc797] hover:bg-[#c9a96e]/10 disabled:opacity-50">{workingId===address.id ? "Updating…" : "Set as default"}</button>}<button onClick={()=>startEdit(address)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-white/25"><Pencil className="size-3.5"/> Edit</button><button disabled={workingId===address.id} onClick={()=>void remove(address)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-300/20 px-3 text-xs text-red-200 hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="size-3.5"/> Delete</button></div>
      </article>)}</div>}
      <p className="mt-8 text-center text-[11px] text-white/25">Saved addresses are associated with your signed-in Timora account.</p>
    </div>
  </main>
}
