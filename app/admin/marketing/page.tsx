"use client"

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarClock, Camera, CheckCircle2, LoaderCircle, Plus, RefreshCw, Send, ShieldCheck, Upload, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "admin" | "employee"
type MarketingContent = {
  id: string
  platform: "instagram"
  content_type: "post" | "story" | "reel"
  title: string
  caption: string | null
  hashtags: string[]
  media_url: string | null
  destination_url: string | null
  status: string
  scheduled_at: string | null
  published_at: string | null
  created_at: string
}
const statuses = ["draft", "pending_approval", "approved", "scheduled", "published", "rejected", "archived"]
const tone: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-white/60",
  pending_approval: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  approved: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  scheduled: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  published: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  rejected: "border-red-300/20 bg-red-300/10 text-red-200",
  archived: "border-white/10 bg-white/5 text-white/40",
}
const friendlyError = (error: unknown) => error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Something went wrong."
const safeHttps = (value: string) => { try { return new URL(value).protocol === "https:" } catch { return false } }

export default function MarketingStudioPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState("")
  const [canManage, setCanManage] = useState(false)
  const [canPublish, setCanPublish] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [items, setItems] = useState<MarketingContent[]>([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [title, setTitle] = useState("")
  const [contentType, setContentType] = useState<MarketingContent["content_type"]>("post")
  const [caption, setCaption] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [destinationUrl, setDestinationUrl] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadContent = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase.from("marketing_content").select("*").order("created_at", { ascending: false }).limit(200)
      if (queryError) throw queryError
      setItems((data ?? []) as MarketingContent[])
    } catch (err) {
      setError(`Could not load marketing content. Confirm migration 202610170001_business_growth_foundation.sql is applied. ${friendlyError(err)}`)
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
          router.replace("/login?next=%2Fadmin%2Fmarketing")
          return
        }
        const { data: staff, error: staffError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (staffError) throw staffError
        if (!staff || !["admin", "employee"].includes(staff.role)) {
          router.replace("/")
          return
        }
        let manage = staff.role === "admin"
        let publish = staff.role === "admin"
        if (staff.role === "employee") {
          const { data, error: permissionError } = await supabase.from("staff_permissions").select("manage_marketing_content,publish_marketing_content").eq("user_id", user.id).maybeSingle()
          if (permissionError) throw permissionError
          manage = Boolean(data?.manage_marketing_content)
          publish = Boolean(data?.publish_marketing_content)
        }
        if (!manage) {
          router.replace("/")
          return
        }
        if (!active) return
        setRole(staff.role as Role)
        setUserId(user.id)
        setCanManage(manage)
        setCanPublish(publish)
        await loadContent()
      } catch (err) {
        if (active) setError(`Could not verify marketing access: ${friendlyError(err)}`)
      } finally {
        if (active) setChecking(false)
      }
    }
    void verify()
    return () => { active = false }
  }, [router, loadContent])

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setError("Choose a JPG, PNG, WebP or AVIF image. Video uploads are not enabled in this first planner.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("The image must be 8 MB or smaller.")
      return
    }
    setUploading(true)
    setError("")
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop()?.toLowerCase() || "webp"
      const path = `marketing/${userId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("ad-creatives").upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from("ad-creatives").getPublicUrl(path)
      if (!safeHttps(data.publicUrl)) throw new Error("Could not create a secure public image URL.")
      setMediaUrl(data.publicUrl)
      setNotice("Creative uploaded. Save your draft to keep it.")
    } catch (err) {
      setError(`Could not upload media: ${friendlyError(err)}`)
    } finally {
      setUploading(false)
    }
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId || !title.trim()) return
    if (mediaUrl && !safeHttps(mediaUrl)) {
      setError("Media URL must use HTTPS.")
      return
    }
    const internalDestination = destinationUrl.startsWith("/") && !destinationUrl.startsWith("//")
    if (destinationUrl.trim() && !internalDestination && !safeHttps(destinationUrl.trim())) {
      setError("Destination must be a Timora path or HTTPS URL.")
      return
    }
    if (scheduledAt && new Date(scheduledAt) <= new Date()) {
      setError("Choose a future time for scheduled content.")
      return
    }
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from("marketing_content").insert({
        platform: "instagram",
        content_type: contentType,
        title: title.trim(),
        caption: caption.trim() || null,
        hashtags: hashtags.split(/[\s,]+/).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 30),
        media_url: mediaUrl || null,
        destination_url: destinationUrl.trim() || null,
        status: "draft",
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        created_by: userId,
      })
      if (insertError) throw insertError
      setTitle("")
      setCaption("")
      setHashtags("")
      setMediaUrl("")
      setDestinationUrl("")
      setScheduledAt("")
      setNotice("Marketing draft saved. It has not been posted to Instagram.")
      await loadContent()
    } catch (err) {
      setError(`Could not save draft: ${friendlyError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(item: MarketingContent, nextStatus: "pending_approval" | "approved" | "scheduled" | "archived") {
    if (nextStatus !== "pending_approval" && !canPublish) return
    setBusyId(item.id)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const updates: Record<string, string | null> = { status: nextStatus }
      if (nextStatus === "approved" || nextStatus === "scheduled") updates.approved_by = userId
      if (nextStatus === "scheduled") {
        if (!item.scheduled_at || new Date(item.scheduled_at) <= new Date()) {
          throw new Error("Set a future schedule time by editing the draft before scheduling.")
        }
      }
      const { error: updateError } = await supabase.from("marketing_content").update(updates).eq("id", item.id)
      if (updateError) throw updateError
      setNotice(nextStatus === "pending_approval" ? "Content submitted for review." : nextStatus === "approved" ? "Content approved. It is not yet published on Instagram." : nextStatus === "scheduled" ? "Content added to the schedule. Direct Instagram publishing is not connected yet." : "Content archived.")
      await loadContent()
    } catch (err) {
      setError(`Could not update content: ${friendlyError(err)}`)
    } finally {
      setBusyId(null)
    }
  }

  const visibleItems = items.filter((item) => statusFilter === "all" || item.status === statusFilter)
  if (checking) return <main className="grid min-h-screen place-items-center bg-[#090a0b] text-[#d9b65d]"><LoaderCircle className="size-6 animate-spin" /><span className="sr-only">Checking marketing access</span></main>
  if (!role || !canManage) return <main className="grid min-h-screen place-items-center bg-[#090a0b] px-5 text-white"><div className="max-w-md text-center"><ShieldCheck className="mx-auto size-9 text-[#d9b65d]" /><h1 className="mt-3 text-xl font-semibold">Marketing access unavailable</h1><p className="mt-2 text-sm text-white/55">{error || "Ask an administrator to grant marketing-content access."}</p><Link href="/" className="mt-4 inline-block text-sm text-[#e4c878]">Return to store</Link></div></main>

  return (
    <main className="min-h-screen bg-[#090a0b] text-[#f6f5f0]">
      <header className="sticky top-0 z-20 border-b border-[#d9b65d]/15 bg-[#090a0b]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><Link href={role === "admin" ? "/admin" : "/admin/tasks"} aria-label="Back to dashboard" className="grid size-10 place-items-center rounded-full border border-white/10"><ArrowLeft className="size-4" /></Link><div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Growth Studio · Instagram</p></div></div><button type="button" onClick={() => void loadContent()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div></header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/5 px-3 py-1.5 text-xs text-[#e4c878]"><Camera className="size-4" />Content planner</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Instagram <span className="text-[#d4af37]">Marketing Studio</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Prepare posts, Stories and Reels, organize campaigns, and send content for approval. This planner does not publish to Instagram until Meta integration is configured.</p></div>{canPublish && <span className="self-start rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">Approval / scheduling access</span>}</div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200"><CheckCircle2 className="size-5 shrink-0" />{notice}</div>}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-[#d4af37]/20 bg-white/[0.025] p-5 sm:p-7"><div className="mb-5"><h2 className="text-lg font-semibold">Create content draft</h2><p className="mt-1 text-sm text-white/45">Store the idea and creative before scheduling or review.</p></div>
            <form onSubmit={createDraft} className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Content title</span><input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" placeholder="New arrivals — everyday luxury" /></label>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Format</span><select value={contentType} onChange={(e) => setContentType(e.target.value as MarketingContent["content_type"])} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm"><option value="post">Feed post</option><option value="story">Story</option><option value="reel">Reel</option></select></label>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Caption</span><textarea rows={4} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm" placeholder="Write the caption customers will see..." /></label>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Hashtags (space or comma separated)</span><input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" placeholder="#Timora #EverydayLuxury" /></label>
              <div className="rounded-xl border border-dashed border-[#d4af37]/30 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Creative image</p><p className="mt-1 text-xs text-white/40">JPG, PNG, WebP or AVIF · up to 8 MB</p></div><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 text-xs"><Upload className="size-4" />Upload<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => void uploadMedia(e)} disabled={uploading} /></label></div><label className="mt-3 block"><span className="mb-1 block text-xs text-white/45">Or media URL (HTTPS)</span><input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm" /></label>{mediaUrl && <img src={mediaUrl} alt="Content creative preview" className="mt-3 max-h-52 w-full rounded-lg object-contain" />}{uploading && <p className="mt-2 text-xs text-white/45">Uploading creative…</p>}</div>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Product / campaign link (optional)</span><input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" placeholder="/products/product-slug or https://..." /></label>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Planned publish time (optional)</span><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm" /><span className="mt-1 block text-[11px] text-white/35">This records the plan only; it does not post to Instagram.</span></label>
              <button type="submit" disabled={saving || uploading || !title.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 text-sm font-semibold text-black disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}Save draft</button>
            </form>
          </section>
          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02]"><div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Content calendar</h2><p className="mt-1 text-xs text-white/45">{items.length} saved entries</p></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-10 rounded-lg border border-white/10 bg-[#111] px-3 text-xs"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
            {loading && items.length === 0 ? <div className="p-10 text-center text-sm text-white/45"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />Loading content…</div> : visibleItems.length === 0 ? <div className="p-10 text-center text-sm text-white/45">No content in this status yet.</div> : <ul className="divide-y divide-white/[0.07]">{visibleItems.map((item) => <li key={item.id} className="p-4 sm:p-5"><div className="flex gap-3">{item.media_url && <img src={item.media_url} alt="" className="size-20 shrink-0 rounded-lg border border-white/10 object-cover" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-medium">{item.title}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone[item.status] ?? tone.draft}`}>{item.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-[11px] uppercase tracking-wide text-white/35">{item.content_type} · Instagram</p>{item.caption && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-white/55">{item.caption}</p>}{item.hashtags.length > 0 && <p className="mt-2 break-words text-[11px] text-[#e4c878]">{item.hashtags.map((tag) => `#${tag}`).join(" ")}</p>}<p className="mt-2 text-[11px] text-white/35">{item.scheduled_at ? `Planned: ${new Date(item.scheduled_at).toLocaleString("en-IN")}` : `Created: ${new Date(item.created_at).toLocaleDateString("en-IN")}`}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{item.status === "draft" && <button type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, "pending_approval")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-300/20 px-3 text-xs text-sky-200 disabled:opacity-50"><Send className="size-3.5" />Submit for review</button>}{canPublish && item.status === "pending_approval" && <button type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, "approved")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 text-xs font-semibold text-black disabled:opacity-50"><CheckCircle2 className="size-3.5" />Approve draft</button>}{canPublish && item.status === "approved" && item.scheduled_at && new Date(item.scheduled_at) > new Date() && <button type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, "scheduled")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-300/20 px-3 text-xs text-violet-200 disabled:opacity-50"><CalendarClock className="size-3.5" />Confirm schedule</button>}{!["archived","published"].includes(item.status) && <button type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, "archived")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/50 disabled:opacity-50">Archive</button>}</div></li>)}</ul>}
            <div className="border-t border-white/10 px-5 py-4 text-[11px] leading-5 text-white/35">Publishing to Instagram is not connected. This page stores ideas, creatives, approval status and planned times only; it will never claim an Instagram post is live without confirmation from Meta.</div>
          </section>
        </div>
      </div>
    </main>
  )
}
