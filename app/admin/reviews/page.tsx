"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, LogOut, RefreshCw, ShieldCheck, Star, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type ReviewRow = { id: string; product_id: string; customer_id: string; rating: number; title: string; body: string; status: string; created_at: string }
type ProductRow = { id: string; name: string; slug: string }

export default function AdminReviewsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [products, setProducts] = useState<Record<string, ProductRow>>({})
  const [filter, setFilter] = useState<"pending" | "all">("pending")
  const [loading, setLoading] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadReviews = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase.from("product_reviews").select("id,product_id,customer_id,rating,title,body,status,created_at").order("created_at", { ascending: false })
      if (queryError) throw queryError
      const rows = (data ?? []) as ReviewRow[]
      setReviews(rows)
      const ids = [...new Set(rows.map((row) => row.product_id))]
      if (ids.length) {
        const { data: productRows, error: productError } = await supabase.from("products").select("id,name,slug").in("id", ids)
        if (productError) throw productError
        setProducts(Object.fromEntries(((productRows ?? []) as ProductRow[]).map((row) => [row.id, row])))
      } else setProducts({})
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load reviews.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    async function verify() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace("/login?next=%2Fadmin%2Freviews"); return }
        const { data: staff, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staff || !["admin", "employee"].includes(staff.role)) { router.replace("/"); return }
        if (active) { setAuthorized(true); await loadReviews() }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Could not verify staff access.") }
      finally { if (active) setChecking(false) }
    }
    void verify()
    return () => { active = false }
  }, [router, loadReviews])

  async function moderate(reviewId: string, decision: "approved" | "rejected") {
    setWorkingId(reviewId); setError(""); setNotice("")
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("moderate_product_review", { p_review_id: reviewId, p_decision: decision })
      if (rpcError) throw rpcError
      setNotice(decision === "approved" ? "Review approved and now visible on the product page." : "Review rejected.")
      await loadReviews()
    } catch (err) { setError(err instanceof Error ? err.message : "Could not moderate this review.") }
    finally { setWorkingId(null) }
  }

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.replace("/login"); router.refresh() }
  const visible = reviews.filter((review) => filter === "all" || review.status === "pending")

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]">Checking staff access…</main>
  if (!authorized) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] p-6 text-white"><div className="text-center"><ShieldCheck className="mx-auto size-8 text-[#d4af37]"/><h1 className="mt-3 text-xl font-semibold">Staff access required</h1><Link href="/" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 text-sm">Return to store</Link></div></main>

  return <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]">
    <header className="sticky top-0 z-20 border-b border-[#d4af37]/20 bg-[#0b0b0a]/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><Link href="/admin" aria-label="Back to products" className="grid size-10 place-items-center rounded-full border border-white/10"><ArrowLeft className="size-4"/></Link><div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Review moderation</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void loadReviews()} disabled={loading} aria-label="Refresh reviews" className="grid size-10 place-items-center rounded-full border border-white/10"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`}/></button><button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70"><LogOut className="size-4"/><span className="hidden sm:inline">Sign out</span></button></div></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Customer trust</p><h1 className="mt-2 text-3xl font-medium sm:text-4xl">Product reviews</h1><p className="mt-2 text-sm text-white/55">Only delivered and paid customers can submit reviews. Approve appropriate reviews before publication.</p></div><div className="flex gap-2"><button type="button" onClick={() => setFilter("pending")} className={`min-h-10 rounded-full px-4 text-xs ${filter === "pending" ? "bg-[#d4af37] text-black" : "border border-white/15 text-white/65"}`}>Pending ({reviews.filter((r) => r.status === "pending").length})</button><button type="button" onClick={() => setFilter("all")} className={`min-h-10 rounded-full px-4 text-xs ${filter === "all" ? "bg-[#d4af37] text-black" : "border border-white/15 text-white/65"}`}>All reviews</button></div></div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-300/25 bg-red-300/5 p-3 text-sm text-red-200">{error}</p>}{notice && <p role="status" className="mt-5 rounded-lg border border-emerald-300/25 bg-emerald-300/5 p-3 text-sm text-emerald-200">{notice}</p>}
      <div className="mt-6 space-y-4">{loading && !reviews.length ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading reviews…</p> : visible.length ? visible.map((review) => <article key={review.id} className="rounded-2xl border border-white/10 bg-[#11110f] p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs text-[#d4af37]">{products[review.product_id]?.name || "Product removed"} · {review.status}</p><h2 className="mt-2 text-lg font-semibold">{review.title}</h2><div className="mt-2 flex gap-1" aria-label={`${review.rating} out of 5 stars`}>{Array.from({length:5},(_,i)=><Star key={i} className={`size-4 ${i<review.rating?"fill-[#d4af37] text-[#d4af37]":"text-white/20"}`}/>)}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{review.body}</p><p className="mt-3 break-all text-[10px] text-white/35">Customer ID: {review.customer_id} · Submitted {new Date(review.created_at).toLocaleString("en-IN")}</p></div>{review.status === "pending" && <div className="flex shrink-0 gap-2"><button type="button" disabled={workingId===review.id} onClick={() => void moderate(review.id,"rejected")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-300/25 px-3 text-xs text-red-200 disabled:opacity-50"><X className="size-4"/>Reject</button><button type="button" disabled={workingId===review.id} onClick={() => void moderate(review.id,"approved")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4af37] px-3 text-xs font-semibold text-[#17130c] disabled:opacity-50"><Check className="size-4"/>Approve</button></div>}</div></article>) : <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><Star className="mx-auto size-8 text-[#d4af37]/60"/><p className="mt-3 text-sm text-white/65">{filter === "pending" ? "No reviews awaiting moderation." : "No reviews have been submitted yet."}</p></div>}</div>
    </div>
  </main>
}
