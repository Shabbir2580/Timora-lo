"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { LoaderCircle, MessageSquare, Send, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Review = { id: string; rating: number; title: string; body: string; created_at: string }

export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const isLiveProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadReviews = useCallback(async () => {
    if (!isLiveProduct) { setReviews([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data, error: reviewError }, { data: authData }] = await Promise.all([
        supabase.from("product_reviews").select("id,rating,title,body,created_at").eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ])
      // Resolve auth independently from the public reviews query. A reviews-table
      // permission/network error must never make a signed-in customer look signed out.
      setUserId(authData.user?.id ?? null)
      if (reviewError) throw reviewError
      setReviews((data ?? []) as Review[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reviews could not be loaded.")
    } finally { setLoading(false) }
  }, [isLiveProduct, productId])

  useEffect(() => { void loadReviews() }, [loadReviews])

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    if (!userId) { setError("Please sign in before submitting a review."); return }
    setSending(true)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("submit_product_review", { p_product_id: productId, p_rating: rating, p_title: title.trim(), p_body: body.trim() })
      if (rpcError) throw rpcError
      setTitle("")
      setBody("")
      setNotice("Review submitted. It will appear publicly after staff approval.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your review could not be submitted.")
    } finally { setSending(false) }
  }

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  return (
    <section className="mt-12 border-t border-white/10 pt-8 sm:mt-16 sm:pt-10" aria-labelledby="reviews-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] uppercase tracking-[0.25em] text-[#c9a96e]">Customer feedback</p><h2 id="reviews-heading" className="mt-2 text-2xl font-semibold">Reviews for {productName}</h2><p className="mt-2 text-sm text-white/50">Only reviews from delivered and paid orders can be submitted. New reviews are moderated before publication.</p></div>
        {isLiveProduct && reviews.length > 0 && <div className="flex items-center gap-2 text-sm"><Star className="size-4 fill-[#d4af37] text-[#d4af37]"/><strong>{average.toFixed(1)}</strong><span className="text-white/45">({reviews.length} approved)</span></div>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-200">{error}</p>}
      {!isLiveProduct ? <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-white/55">Customer reviews will be available when this preview product is added to the live catalogue.</p> : <>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {loading ? <p className="flex items-center gap-2 text-sm text-white/50"><LoaderCircle className="size-4 animate-spin"/>Loading reviews…</p> : reviews.length ? reviews.map((review) => <article key={review.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < review.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-white/20"}`}/>)}</div><h3 className="mt-2 font-medium">{review.title}</h3></div><time className="shrink-0 text-[10px] text-white/35">{new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">{review.body}</p></article>) : <div className="rounded-xl border border-dashed border-white/15 p-7 text-center"><MessageSquare className="mx-auto size-6 text-[#c9a96e]/60"/><p className="mt-3 text-sm text-white/70">No approved reviews yet</p><p className="mt-1 text-xs text-white/40">Purchased this product? You can submit the first review after delivery.</p></div>}
          </div>
          <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
            <h3 className="font-semibold">Write a review</h3>
            {!userId ? <p className="mt-2 text-sm leading-6 text-white/55">Sign in with the account used for your order to submit a verified-purchase review.</p> : <><p className="mt-2 text-sm leading-6 text-white/55">Reviews are reserved for verified purchases. You can submit a review after your order has been delivered and payment is complete.</p><form onSubmit={submitReview} className="mt-4 space-y-3">
              <label className="block text-xs text-white/60">Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#c9a96e]">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}</select></label>
              <label className="block text-xs text-white/60">Title<input required minLength={1} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#c9a96e]" placeholder="Summarize your experience"/></label>
              <label className="block text-xs text-white/60">Your review<textarea required minLength={5} maxLength={2000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 py-2 text-sm text-white outline-none focus:border-[#c9a96e]" placeholder="What should other shoppers know?"/></label>
              {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/5 p-2 text-xs text-red-200">{error}</p>}
              {notice && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-2 text-xs text-emerald-200">{notice}</p>}
              <button disabled={sending} type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-4 text-sm font-semibold text-[#17130c] disabled:opacity-50"><Send className="size-4"/>{sending ? "Submitting…" : "Submit review"}</button>
            </form></>}
            {!userId && <Link href="/login?next=%2Forders" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-[#c9a96e]/35 px-4 text-sm text-[#dfc797] hover:bg-[#c9a96e]/10">Sign in to review</Link>}
          </aside>
        </div>
      </>}
    </section>
  )
}
