"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { LoaderCircle, MessageSquare, Send, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Review = { id: string; rating: number; title: string; body: string; created_at: string; image_urls?: string[] }

export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const isLiveProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [canReview, setCanReview] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [eligibilityError, setEligibilityError] = useState("")
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadReviews = useCallback(async () => {
    if (!isLiveProduct) { setReviews([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data, error: reviewError }, { data: authData }] = await Promise.all([
        supabase.from("product_reviews").select("id,rating,title,body,created_at,image_urls").eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ])
      // Resolve auth independently from the public reviews query. A reviews-table
      // permission/network error must never make a signed-in customer look signed out.
      setUserId(authData.user?.id ?? null)
      if (reviewError) throw reviewError
      setReviews(((data ?? []) as Review[]).map((review) => ({
        ...review,
        image_urls: (review.image_urls ?? []).map((path) =>
          supabase.storage.from("product-review-photos").getPublicUrl(path).data.publicUrl
        ),
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reviews could not be loaded.")
    } finally { setLoading(false) }
  }, [isLiveProduct, productId])

  useEffect(() => { void loadReviews() }, [loadReviews])

  useEffect(() => {
    let cancelled = false

    async function checkReviewEligibility() {
      setCanReview(false)
      setEligibilityError("")
      if (!isLiveProduct || !userId) {
        setCheckingEligibility(false)
        return
      }

      setCheckingEligibility(true)
      try {
        const supabase = createClient()
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id")
          .eq("customer_id", userId)
          .eq("order_status", "delivered")
          .eq("payment_status", "paid")

        if (ordersError) throw ordersError
        const orderIds = (orders ?? []).map((order) => order.id)

        if (orderIds.length === 0) {
          if (!cancelled) setCanReview(false)
          return
        }

        const { data: matchingItems, error: itemsError } = await supabase
          .from("order_items")
          .select("product_id")
          .eq("product_id", productId)
          .in("order_id", orderIds)
          .limit(1)

        if (itemsError) throw itemsError
        if (!cancelled) setCanReview((matchingItems ?? []).length > 0)
      } catch {
        if (!cancelled) {
          setCanReview(false)
          setEligibilityError("We couldn't verify your purchase right now. Please try again later.")
        }
      } finally {
        if (!cancelled) setCheckingEligibility(false)
      }
    }

    void checkReviewEligibility()
    return () => { cancelled = true }
  }, [isLiveProduct, productId, userId])

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    if (!userId) { setError("Please sign in before submitting a review."); return }
    if (!canReview) { setError("Only customers with a delivered and paid order for this product can review it."); return }
    if (photos.length > 4) { setError("Choose up to four photos."); return }
    if (photos.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Photos must be JPG, PNG or WebP and no larger than 5 MB each.")
      return
    }
    setSending(true)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("submit_product_review", { p_product_id: productId, p_rating: rating, p_title: title.trim(), p_body: body.trim() })
      if (rpcError) throw rpcError
      let photoWarning = ""
      if (photos.length && userId) {
        try {
          const paths: string[] = []
          for (const file of photos) {
            const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"
            const path = userId + "/" + Date.now() + "-" + crypto.randomUUID() + "." + extension
            const { error: uploadError } = await supabase.storage.from("product-review-photos").upload(path, file, { contentType: file.type, upsert: false })
            if (uploadError) throw uploadError
            paths.push(path)
          }
          const { error: attachError } = await supabase.rpc("attach_product_review_photos", { p_product_id: productId, p_image_urls: paths })
          if (attachError) throw attachError
        } catch (photoError) {
          console.error("Review was submitted but photo upload failed:", photoError)
          photoWarning = " Your review was submitted, but the photos could not be attached."
        }
      }
      setTitle("")
      setBody("")
      setPhotos([])
      setNotice("Review submitted. It will appear publicly after staff approval." + photoWarning)
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
            {loading ? <p className="flex items-center gap-2 text-sm text-white/50"><LoaderCircle className="size-4 animate-spin"/>Loading reviews…</p> : reviews.length ? reviews.map((review) => <article key={review.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < review.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-white/20"}`}/>)}</div><h3 className="mt-2 font-medium">{review.title}</h3></div><time className="shrink-0 text-[10px] text-white/35">{new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">{review.body}</p>{review.image_urls && review.image_urls.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{review.image_urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-white/10"><img src={url} alt={"Customer review photo "+(index+1)} loading="lazy" className="aspect-square w-full object-cover"/></a>)}</div>}</article>) : <div className="rounded-xl border border-dashed border-white/15 p-7 text-center"><MessageSquare className="mx-auto size-6 text-[#c9a96e]/60"/><p className="mt-3 text-sm text-white/70">No approved reviews yet</p><p className="mt-1 text-xs text-white/40">Purchased this product? You can submit the first review after delivery.</p></div>}
          </div>
          <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
            <h3 className="font-semibold">Write a review</h3>
            {!userId ? <p className="mt-2 text-sm leading-6 text-white/55">Sign in with the account used for your order to submit a verified-purchase review.</p> : checkingEligibility ? <p className="mt-2 text-sm leading-6 text-white/55">Checking your purchase history…</p> : eligibilityError ? <p role="alert" className="mt-2 text-sm leading-6 text-red-200">{eligibilityError}</p> : !canReview ? <p className="mt-2 text-sm leading-6 text-white/55">You can review this product after an order containing this exact product has been delivered and payment is complete.</p> : <><p className="mt-2 text-sm leading-6 text-white/55">Verified purchase confirmed. Your review will appear after staff approval.</p><form onSubmit={submitReview} className="mt-4 space-y-3">
              <label className="block text-xs text-white/60">Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#c9a96e]">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}</select></label>
              <label className="block text-xs text-white/60">Title<input required minLength={1} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 text-sm text-white outline-none focus:border-[#c9a96e]" placeholder="Summarize your experience"/></label>
              <label className="block text-xs text-white/60">Your review<textarea required minLength={5} maxLength={2000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b0b0a] px-3 py-2 text-sm text-white outline-none focus:border-[#c9a96e]" placeholder="What should other shoppers know?"/></label>
              <label className="block text-xs text-white/60">Photos (optional, up to 4)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
                const selected = Array.from(event.target.files ?? [])
                if (selected.length > 4) { setError("Choose up to four photos."); setPhotos(selected.slice(0, 4)); return }
                setError("")
                setPhotos(selected)
              }} className="mt-1.5 block min-h-10 w-full text-xs text-white/65 file:mr-3 file:min-h-9 file:rounded-full file:border-0 file:bg-[#d4af37] file:px-4 file:text-xs file:font-semibold file:text-[#17130c]"/></label>
              {photos.length > 0 && <p className="text-xs text-white/45">{photos.length} photo(s) selected · JPG, PNG or WebP · maximum 5 MB each</p>}
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
