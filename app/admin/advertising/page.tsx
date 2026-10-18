"use client"

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ExternalLink, ImagePlus,
  LoaderCircle, Megaphone, Pause, Plus, RefreshCw, Send, ShieldCheck, Sparkles,
  Upload, XCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "admin" | "employee"
type Permission = {
  manage_advertisements: boolean
  publish_advertisements: boolean
  manage_advertisers: boolean
  view_advertisement_analytics: boolean
  manage_marketing_content: boolean
  publish_marketing_content: boolean
  view_sales_analytics: boolean
  view_profit_analytics: boolean
}
type Advertiser = {
  id: string
  advertiser_type: "timora" | "external"
  business_name: string
  contact_name: string | null
  contact_email: string | null
  website_url: string | null
  status: string
}
type Campaign = {
  id: string
  advertiser_id: string
  campaign_name: string
  campaign_type: "timora_promotion" | "featured_product" | "external_ad"
  placement: "homepage_hero" | "featured_product" | "category_banner" | "deals_banner" | "homepage_secondary"
  headline: string | null
  description: string | null
  image_url: string
  media_type?: "image" | "video"
  destination_url: string
  product_id: string | null
  status: string
  starts_at: string | null
  ends_at: string | null
  budget_paise: number | null
  cost_paise: number | null
  created_at: string
  advertisers?: { business_name: string } | null
}
type Product = { id: string; name: string; slug: string }
type AnalyticsRow = {
  campaign_id: string
  campaign_name: string
  advertiser_name: string
  placement: Campaign["placement"]
  status: string
  impressions: number
  clicks: number
  add_to_cart: number
  purchases: number
  attributed_revenue_paise: number
  ctr_percent: number
}

const emptyPermission: Permission = {
  manage_advertisements: false,
  publish_advertisements: false,
  manage_advertisers: false,
  view_advertisement_analytics: false,
  manage_marketing_content: false,
  publish_marketing_content: false,
  view_sales_analytics: false,
  view_profit_analytics: false,
}
const placementLabels: Record<Campaign["placement"], string> = {
  homepage_hero: "Homepage hero banner",
  featured_product: "Featured product card",
  category_banner: "Category banner",
  deals_banner: "Deals page banner",
  homepage_secondary: "Lower homepage promotion",
}
const statusStyles: Record<string, string> = {
  draft: "border-white/15 bg-white/5 text-white/65",
  pending_approval: "border-sky-300/25 bg-sky-300/10 text-sky-200",
  approved: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  scheduled: "border-violet-300/25 bg-violet-300/10 text-violet-200",
  live: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  paused: "border-orange-300/25 bg-orange-300/10 text-orange-200",
  rejected: "border-red-300/25 bg-red-300/10 text-red-200",
  expired: "border-white/10 bg-white/5 text-white/40",
  archived: "border-white/10 bg-white/5 text-white/40",
}
const friendlyError = (error: unknown) => {
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    const parts = [
      typeof value.message === "string" ? value.message : "",
      typeof value.code === "string" ? `Code: ${value.code}` : "",
      typeof value.details === "string" ? value.details : "",
      typeof value.hint === "string" ? `Hint: ${value.hint}` : "",
    ].filter(Boolean)
    if (parts.length) return parts.join(" — ")
  }
  return "Something went wrong. Please try again."
}
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled"
const toLocalDateTimeInput = (value: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const safeExternalUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:"
  } catch {
    return false
  }
}

export default function AdminAdvertisingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState("")
  const [permission, setPermission] = useState<Permission>(emptyPermission)
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyCampaign, setBusyCampaign] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showAdvertiserForm, setShowAdvertiserForm] = useState(false)
  const [advertiserName, setAdvertiserName] = useState("")
  const [advertiserType, setAdvertiserType] = useState<"timora" | "external">("timora")
  const [advertiserContact, setAdvertiserContact] = useState("")
  const [advertiserEmail, setAdvertiserEmail] = useState("")
  const [advertiserWebsite, setAdvertiserWebsite] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [campaignType, setCampaignType] = useState<Campaign["campaign_type"]>("timora_promotion")
  const [placement, setPlacement] = useState<Campaign["placement"]>("homepage_hero")
  const [advertiserId, setAdvertiserId] = useState("")
  const [headline, setHeadline] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [destinationUrl, setDestinationUrl] = useState("/")
  const [productId, setProductId] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [uploading, setUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsFrom, setAnalyticsFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10) })
  const [analyticsTo, setAnalyticsTo] = useState(() => new Date().toISOString().slice(0, 10))

  const isAdmin = role === "admin"
  const canManageAdvertisers = isAdmin || permission.manage_advertisers
  const canPublish = isAdmin || permission.publish_advertisements
  const canViewAnalytics = isAdmin || permission.view_advertisement_analytics

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const [advertiserResult, campaignResult, productResult] = await Promise.all([
        supabase.from("ad_advertiser_options").select("id,advertiser_type,business_name,status").order("business_name", { ascending: true }),
        supabase.from("ad_campaigns").select("*,advertisers(business_name)").order("created_at", { ascending: false }).limit(100),
        supabase.from("products").select("id,name,slug").order("name", { ascending: true }).limit(500),
      ])
      if (advertiserResult.error) throw advertiserResult.error
      if (campaignResult.error) throw campaignResult.error
      if (productResult.error) throw productResult.error
      const loadedAdvertisers = (advertiserResult.data ?? []) as Advertiser[]
      setAdvertisers(loadedAdvertisers)
      const advertiserNames = new Map(loadedAdvertisers.map((item) => [item.id, item.business_name]))
      setCampaigns(((campaignResult.data ?? []) as Campaign[]).map((item) => ({
        ...item,
        advertisers: { business_name: advertiserNames.get(item.advertiser_id) ?? "Advertiser" },
      })))
      setProducts((productResult.data ?? []) as Product[])
      setAdvertiserId((current) => current || loadedAdvertisers.find((item) => item.advertiser_type === "timora" && item.status === "active")?.id || loadedAdvertisers[0]?.id || "")
    } catch (err) {
      setError(`Could not load advertising data. Confirm migration 202610170001_business_growth_foundation.sql is applied and staff permissions are correct. ${friendlyError(err)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function verifyAccess() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.replace("/login?next=%2Fadmin%2Fadvertising")
          return
        }
        const { data: staff, error: staffError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (staffError) throw staffError
        if (!staff || !["admin", "employee"].includes(staff.role)) {
          router.replace("/")
          return
        }
        let extra = emptyPermission
        if (staff.role === "employee") {
          const { data, error: permissionError } = await supabase.from("staff_permissions").select("*").eq("user_id", user.id).maybeSingle()
          if (permissionError) throw permissionError
          extra = { ...emptyPermission, ...(data ?? {}) }
          if (!extra.manage_advertisements) {
            router.replace("/")
            return
          }
        }
        if (!active) return
        setRole(staff.role as Role)
        setUserId(user.id)
        setPermission(extra)
        await loadData()
      } catch (err) {
        if (active) setError(`Could not verify advertising access: ${friendlyError(err)}`)
      } finally {
        if (active) setChecking(false)
      }
    }
    void verifyAccess()
    return () => { active = false }
  }, [router, loadData])

  async function createAdvertiser(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!canManageAdvertisers || !userId || !advertiserName.trim()) return
    if (advertiserWebsite.trim() && !safeExternalUrl(advertiserWebsite.trim())) {
      setError("Business website must be a valid HTTPS URL.")
      return
    }
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { data, error: insertError } = await supabase.from("advertisers").insert({
        advertiser_type: advertiserType,
        business_name: advertiserName.trim(),
        contact_name: advertiserContact.trim() || null,
        contact_email: advertiserEmail.trim().toLowerCase() || null,
        website_url: advertiserWebsite.trim() || null,
        created_by: userId,
      }).select("id,advertiser_type,business_name,status").single()
      if (insertError) throw insertError
      setAdvertisers((current) => [data as Advertiser, ...current])
      setAdvertiserId(data.id)
      setAdvertiserName("")
      setAdvertiserContact("")
      setAdvertiserEmail("")
      setAdvertiserWebsite("")
      setShowAdvertiserForm(false)
      setNotice("Advertiser saved.")
    } catch (err) {
      setError(`Could not save advertiser: ${friendlyError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function uploadCreative(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const allowed = [
      "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
      "video/mp4", "video/webm", "video/quicktime", "video/ogg",
    ]
    if (!allowed.includes(file.type)) {
      setError("Choose a JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, OGG or OGV creative.")
      return
    }
    const isVideo = file.type.startsWith("video/")
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024
    if (file.size > maxBytes) {
      setError(isVideo ? "Video creatives must be 100 MB or smaller." : "Image and GIF creatives must be 15 MB or smaller.")
      return
    }
    setUploading(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const extension = file.name.split(".").pop()?.toLowerCase() || "webp"
      const path = `campaigns/${userId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from("ad-creatives").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from("ad-creatives").getPublicUrl(path)
      if (!data.publicUrl || !safeExternalUrl(data.publicUrl)) throw new Error("Could not create a secure public media URL.")
      setImageUrl(data.publicUrl)
      setMediaType(isVideo ? "video" : "image")
      setNotice("Creative uploaded. Save the campaign draft to keep it.")
    } catch (err) {
      setError(`Could not upload creative: ${friendlyError(err)}. Confirm the ad-creatives storage bucket and policies are configured.`)
    } finally {
      setUploading(false)
    }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId) {
      setError("Your staff session could not be verified. Sign out, sign back in, and try again.")
      return
    }
    if (!campaignName.trim()) {
      setError("Enter a campaign name before saving the draft.")
      return
    }
    if (!advertiserId) {
      setError("No advertiser is selected. Create the Timora advertiser in the Advertiser section below, save it, then select it here.")
      setShowAdvertiserForm(true)
      setAdvertiserName("Timora")
      setAdvertiserType("timora")
      document.getElementById("campaign-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    if (!imageUrl.trim() || !safeExternalUrl(imageUrl.trim())) {
      setError("Upload a creative or enter a valid HTTPS media URL.")
      return
    }
    const isInternalDestination = destinationUrl.startsWith("/") && !destinationUrl.startsWith("//")
    if (!isInternalDestination && !safeExternalUrl(destinationUrl)) {
      setError("Destination must be a same-site path or an HTTPS URL.")
      return
    }
    const selectedAdvertiser = advertisers.find((item) => item.id === advertiserId)
    if (!selectedAdvertiser) {
      setError("Choose a valid advertiser.")
      return
    }
    if (campaignType === "external_ad" && selectedAdvertiser.advertiser_type !== "external") {
      setError("External advertisements must belong to an external business advertiser.")
      return
    }
    if (campaignType === "timora_promotion" && selectedAdvertiser.advertiser_type !== "timora") {
      setError("Timora promotions must use the Timora advertiser profile.")
      return
    }
    if (campaignType === "external_ad" && !safeExternalUrl(destinationUrl.trim())) {
      setError("External advertisements must link to a valid HTTPS destination.")
      return
    }
    if (campaignType === "featured_product" && selectedAdvertiser.advertiser_type === "timora" && !productId) {
      setError("Choose a Timora product for a featured product campaign.")
      return
    }
    if (campaignType === "featured_product" && selectedAdvertiser.advertiser_type === "external" && !safeExternalUrl(destinationUrl.trim())) {
      setError("An external sponsored product card must link to the advertiser's HTTPS destination.")
      return
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError("The end date must be later than the start date.")
      return
    }
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const campaignPayload = {
        advertiser_id: advertiserId,
        campaign_name: campaignName.trim(),
        campaign_type: campaignType,
        placement,
        headline: headline.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl.trim(),
        media_type: mediaType,
        destination_url: destinationUrl.trim(),
        product_id: productId || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }
      if (editingCampaignId) {
        const { data, error: updateError } = await supabase
          .from("ad_campaigns")
          .update(campaignPayload)
          .eq("id", editingCampaignId)
          .select("id")
          .maybeSingle()
        if (updateError) throw updateError
        if (!data) throw new Error("No campaign was updated. Your staff permissions may have changed, or the campaign no longer exists.")
      } else {
        const { data, error: insertError } = await supabase
          .from("ad_campaigns")
          .insert({ ...campaignPayload, status: "draft", created_by: userId })
          .select("id")
          .single()
        if (insertError) throw insertError
        if (!data?.id) throw new Error("Supabase did not confirm that the campaign draft was created.")
      }
      setEditingCampaignId(null)
      setCampaignName("")
      setHeadline("")
      setDescription("")
      setImageUrl("")
      setMediaType("image")
      setDestinationUrl("/")
      setProductId("")
      setStartsAt("")
      setEndsAt("")
      setNotice("Campaign draft saved. Submit it for approval or publish it if your permission allows.")
      await loadData()
    } catch (err) {
      const detail = friendlyError(err)
      setError(`Could not save campaign draft. ${detail}`)
    } finally {
      setSaving(false)
    }
  }

  function startEditingCampaign(campaign: Campaign) {
    setEditingCampaignId(campaign.id)
    setCampaignName(campaign.campaign_name)
    setCampaignType(campaign.campaign_type)
    setPlacement(campaign.placement)
    setAdvertiserId(campaign.advertiser_id)
    setHeadline(campaign.headline ?? "")
    setDescription(campaign.description ?? "")
    setImageUrl(campaign.image_url)
    setMediaType(campaign.media_type === "video" ? "video" : "image")
    setDestinationUrl(campaign.destination_url)
    setProductId(campaign.product_id ?? "")
    setStartsAt(toLocalDateTimeInput(campaign.starts_at))
    setEndsAt(toLocalDateTimeInput(campaign.ends_at))
    setNotice("Editing a saved campaign. Changes to a paused or draft campaign will not publish it.")
    document.getElementById("campaign-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function changeCampaignStatus(campaign: Campaign, action: "submit" | "publish" | "pause" | "archive") {
    setBusyCampaign(campaign.id)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const now = new Date()
      const scheduledInFuture = Boolean(campaign.starts_at && new Date(campaign.starts_at) > now)
      const status = action === "submit" ? "pending_approval" : action === "pause" ? "paused" : action === "archive" ? "archived" : scheduledInFuture ? "scheduled" : "live"
      const updates: Record<string, string | null> = { status }
      if (action === "publish") {
        updates.approved_by = userId
        updates.published_by = userId
      }
      const { error: updateError } = await supabase.from("ad_campaigns").update(updates).eq("id", campaign.id)
      if (updateError) throw updateError
      setNotice(action === "submit" ? "Campaign submitted for approval." : action === "pause" ? "Campaign paused." : action === "archive" ? "Campaign archived." : status === "scheduled" ? "Campaign approved and scheduled." : "Campaign published.")
      await loadData()
    } catch (err) {
      setError(`Could not update campaign: ${friendlyError(err)}`)
    } finally {
      setBusyCampaign(null)
    }
  }

  useEffect(() => {
    if (!role || !canViewAnalytics) {
      setAnalyticsRows([])
      return
    }
    let active = true
    async function loadAnalytics() {
      setAnalyticsLoading(true)
      try {
        const supabase = createClient()
        const { data, error: analyticsError } = await supabase.rpc("get_advertising_analytics", {
          p_from: analyticsFrom,
          p_to: analyticsTo,
        })
        if (analyticsError) throw analyticsError
        const payload = data as { campaigns?: AnalyticsRow[] } | null
        if (active) setAnalyticsRows(Array.isArray(payload?.campaigns) ? payload.campaigns : [])
      } catch (err) {
        if (active) {
          setAnalyticsRows([])
          setError(`Could not load campaign analytics: ${friendlyError(err)}`)
        }
      } finally {
        if (active) setAnalyticsLoading(false)
      }
    }
    void loadAnalytics()
    return () => { active = false }
  }, [role, canViewAnalytics, analyticsFrom, analyticsTo])

  const filteredCampaigns = useMemo(() => campaigns.filter((campaign) => statusFilter === "all" || campaign.status === statusFilter), [campaigns, statusFilter])
  const stats = useMemo(() => ({
    total: campaigns.length,
    live: campaigns.filter((item) => item.status === "live" || item.status === "scheduled").length,
    pending: campaigns.filter((item) => item.status === "pending_approval").length,
    paused: campaigns.filter((item) => item.status === "paused").length,
  }), [campaigns])

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#090a0b] text-[#d9b65d]"><LoaderCircle className="size-6 animate-spin" /><span className="sr-only">Checking advertising access</span></main>
  if (!role) return <main className="grid min-h-screen place-items-center bg-[#090a0b] px-5 text-white"><div className="max-w-md text-center"><ShieldCheck className="mx-auto size-9 text-[#d9b65d]" /><h1 className="mt-3 text-xl font-semibold">Advertising access unavailable</h1><p className="mt-2 text-sm text-white/55">{error || "An admin must grant advertising-management access to this account."}</p><Link href="/" className="mt-4 inline-block text-sm text-[#e4c878]">Return to store</Link></div></main>

  return (
    <main className="min-h-screen bg-[#090a0b] text-[#f6f5f0]">
      <header className="sticky top-0 z-20 border-b border-[#d9b65d]/15 bg-[#090a0b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={isAdmin ? "/admin" : "/admin/tasks"} aria-label="Back to dashboard" className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 hover:border-[#d4af37]/50"><ArrowLeft className="size-4" /></Link>
            <div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Growth Studio · Advertising</p></div>
          </div>
          <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/5 px-3 py-1.5 text-xs text-[#e4c878]"><Sparkles className="size-4" />Growth Studio</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Advertising <span className="text-[#d4af37]">Manager</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Create campaigns for Timora or external businesses, upload creatives, and manage the approval workflow.</p></div>
          <div className="flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/65">{isAdmin ? "Administrator" : "Important Employee"}</span>{canPublish && <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">Direct publishing enabled</span>}</div>
        </div>

        {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200"><XCircle className="mt-0.5 size-5 shrink-0" /><p className="break-words">{error}</p></div>}
        {notice && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><p className="break-words">{notice}</p></div>}

        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "Campaigns", value: stats.total, icon: Megaphone }, { label: "Live / scheduled", value: stats.live, icon: CalendarClock }, { label: "Awaiting approval", value: stats.pending, icon: ShieldCheck }, { label: "Paused", value: stats.paused, icon: Pause }].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"><item.icon className="mb-3 size-5 text-[#d4af37]" /><p className="text-xs text-white/45">{item.label}</p><p className="mt-1 text-2xl font-semibold">{item.value}</p></div>)}
        </section>

        {canViewAnalytics && (
          <section className="mb-8 rounded-2xl border border-emerald-300/15 bg-white/[0.02] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><h2 className="text-lg font-semibold">Campaign performance</h2><p className="mt-1 text-sm text-white/45">Impressions are counted after at least half of a placement becomes visible. Purchase attribution only counts verified eligible orders.</p></div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <label className="text-[11px] text-white/45">From<input type="date" value={analyticsFrom} max={analyticsTo} onChange={(e) => setAnalyticsFrom(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#111] px-2 text-xs text-white" /></label>
                <label className="text-[11px] text-white/45">To<input type="date" value={analyticsTo} min={analyticsFrom} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setAnalyticsTo(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#111] px-2 text-xs text-white" /></label>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { label: "Impressions", value: analyticsRows.reduce((sum, row) => sum + Number(row.impressions || 0), 0).toLocaleString("en-IN") },
                { label: "Clicks", value: analyticsRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0).toLocaleString("en-IN") },
                { label: "CTR", value: (() => { const impressions = analyticsRows.reduce((sum, row) => sum + Number(row.impressions || 0), 0); const clicks = analyticsRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0); return impressions ? `${(clicks * 100 / impressions).toFixed(2)}%` : "0.00%" })() },
                { label: "Add to cart", value: analyticsRows.reduce((sum, row) => sum + Number(row.add_to_cart || 0), 0).toLocaleString("en-IN") },
                { label: "Attributed purchases", value: analyticsRows.reduce((sum, row) => sum + Number(row.purchases || 0), 0).toLocaleString("en-IN") },
              ].map((item) => <div key={item.label} className="rounded-xl border border-white/[0.07] bg-black/20 p-3"><p className="text-[11px] text-white/40">{item.label}</p><p className="mt-1 text-xl font-semibold">{analyticsLoading ? "…" : item.value}</p></div>)}
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-white/[0.035] text-white/45"><tr><th className="px-3 py-3 font-medium">Campaign</th><th className="px-3 py-3 font-medium">Impressions</th><th className="px-3 py-3 font-medium">Clicks</th><th className="px-3 py-3 font-medium">CTR</th><th className="px-3 py-3 font-medium">Purchases</th><th className="px-3 py-3 font-medium">Attributed revenue</th></tr></thead>
                <tbody className="divide-y divide-white/[0.06]">{analyticsRows.map((row) => <tr key={row.campaign_id}><td className="px-3 py-3"><p className="font-medium">{row.campaign_name}</p><p className="mt-1 text-[10px] text-white/35">{row.advertiser_name}</p></td><td className="px-3 py-3">{Number(row.impressions).toLocaleString("en-IN")}</td><td className="px-3 py-3">{Number(row.clicks).toLocaleString("en-IN")}</td><td className="px-3 py-3">{Number(row.ctr_percent).toFixed(2)}%</td><td className="px-3 py-3">{Number(row.purchases).toLocaleString("en-IN")}</td><td className="px-3 py-3">₹{(Number(row.attributed_revenue_paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>)}
                  {!analyticsLoading && analyticsRows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-white/40">No campaign activity recorded for this period yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-white/35">ROAS is not displayed until campaign costs are entered and verified. Purchase attribution uses a 30-day click window and may not capture cross-device or cross-session purchases.</p>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section id="campaign-form" className="scroll-mt-24 rounded-2xl border border-[#d4af37]/20 bg-white/[0.025] p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{editingCampaignId ? "Edit campaign" : "Create campaign"}</h2><p className="mt-1 text-sm text-white/45">{editingCampaignId ? "Editing preserves the current campaign status." : "New campaigns start as drafts and are not shown publicly."}</p></div><div className="grid size-10 place-items-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]"><Plus className="size-5" /></div></div>
            <form onSubmit={createCampaign} className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Campaign name</span><input required minLength={1} maxLength={160} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-[#d4af37]/50" placeholder="Diwali collection promotion" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Campaign type</span><select value={campaignType} onChange={(e) => setCampaignType(e.target.value as Campaign["campaign_type"])} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm"><option value="timora_promotion">Timora promotion</option><option value="featured_product">Featured product</option><option value="external_ad">External advertisement</option></select></label>
                <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Placement</span><select value={placement} onChange={(e) => setPlacement(e.target.value as Campaign["placement"])} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm">{Object.entries(placementLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              </div>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Advertiser</span><select required value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm"><option value="">Choose advertiser</option>{advertisers.filter((a) => a.status === "active").map((a) => <option key={a.id} value={a.id}>{a.business_name} · {a.advertiser_type === "timora" ? "Timora" : "External"}</option>)}</select>{advertisers.filter((a) => a.status === "active").length === 0 && <span className="mt-2 block rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100">No active advertiser exists yet, so a draft cannot be saved. Create the Timora advertiser below first.</span>}{canManageAdvertisers && <button type="button" onClick={() => { setShowAdvertiserForm((value) => !value); if (!showAdvertiserForm && !advertiserName) { setAdvertiserName("Timora"); setAdvertiserType("timora") } }} className="mt-2 text-xs text-[#e4c878] hover:underline">{showAdvertiserForm ? "Hide advertiser form" : advertisers.length === 0 ? "+ Create Timora advertiser (required first)" : "+ Add advertiser"}</button>}</label>
              {showAdvertiserForm && canManageAdvertisers && <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-medium">New advertiser</p><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs text-white/50">Business name</span><input value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} required maxLength={160} className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm" /></label><label className="block"><span className="mb-1 block text-xs text-white/50">Type</span><select value={advertiserType} onChange={(e) => setAdvertiserType(e.target.value as "timora" | "external")} className="min-h-10 w-full rounded-lg border border-white/10 bg-[#111] px-3 text-sm"><option value="timora">Timora</option><option value="external">External business</option></select></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs text-white/50">Contact name (optional)</span><input value={advertiserContact} onChange={(e) => setAdvertiserContact(e.target.value)} className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm" /></label><label className="block"><span className="mb-1 block text-xs text-white/50">Contact email (optional)</span><input type="email" value={advertiserEmail} onChange={(e) => setAdvertiserEmail(e.target.value)} className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm" /></label></div><label className="block"><span className="mb-1 block text-xs text-white/50">Website HTTPS URL (optional)</span><input type="url" value={advertiserWebsite} onChange={(e) => setAdvertiserWebsite(e.target.value)} placeholder="https://example.com" className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm" /></label><button type="button" onClick={() => void createAdvertiser()} disabled={saving || !advertiserName.trim()} className="min-h-10 rounded-lg bg-white/10 px-4 text-xs font-medium hover:bg-white/15 disabled:opacity-50">Save advertiser</button></div>}
              <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Headline (optional)</span><input maxLength={160} value={headline} onChange={(e) => setHeadline(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Featured product (optional)</span><select value={productId} onChange={(e) => setProductId(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm"><option value="">No product linked</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Description (optional)</span><textarea rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm" /></label>
              <div className="rounded-xl border border-dashed border-[#d4af37]/30 bg-[#d4af37]/[0.03] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><ImagePlus className="mt-0.5 size-5 shrink-0 text-[#d4af37]" /><div><p className="text-sm font-medium">Campaign creative</p><p className="mt-1 text-xs leading-5 text-white/45">Images/GIF up to 15 MB · MP4, WebM, MOV, OGG or OGV video up to 100 MB</p></div></div><label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-xs hover:border-[#d4af37]/40">{uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploading ? "Uploading..." : "Upload media"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime,video/ogg" disabled={uploading} onChange={(event) => void uploadCreative(event)} className="sr-only" /></label></div><div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]"><label className="block"><span className="mb-1 block text-xs text-white/50">Media URL (HTTPS)</span><input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm" /></label><label className="block"><span className="mb-1 block text-xs text-white/50">URL media format</span><select value={mediaType} onChange={(e) => setMediaType(e.target.value as "image" | "video")} className="min-h-10 w-full rounded-lg border border-white/10 bg-[#111] px-3 text-sm"><option value="image">Image / GIF</option><option value="video">Video</option></select></label></div>{imageUrl && <div className="mt-3 overflow-hidden rounded-lg border border-white/10">{mediaType === "video" ? <video src={imageUrl} controls muted playsInline className="max-h-64 w-full object-contain" /> : <img src={imageUrl} alt="Campaign creative preview" className="max-h-48 w-full object-contain" />}</div>}</div>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Destination URL or Timora path</span><input required value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="/products/example" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm" /><span className="mt-1 block text-[11px] text-white/35">Use a same-site path or a verified HTTPS external destination.</span></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Start date (optional)</span><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-xs font-medium text-white/60">End date (optional)</span><input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-3 text-sm" /></label></div>
              <button type="submit" disabled={saving || uploading || !campaignName.trim() || !advertiserId} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 text-sm font-semibold text-black transition hover:bg-[#e4c878] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : editingCampaignId ? <CheckCircle2 className="size-4" /> : <Plus className="size-4" />}{editingCampaignId ? "Save campaign changes" : "Save campaign draft"}</button>{editingCampaignId && <button type="button" onClick={() => { setEditingCampaignId(null); setCampaignName(""); setHeadline(""); setDescription(""); setImageUrl(""); setDestinationUrl("/"); setProductId(""); setStartsAt(""); setEndsAt(""); setMediaType("image"); }} className="min-h-10 w-full rounded-xl border border-white/10 text-xs text-white/60">Cancel editing</button>}
            </form>
          </section>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-semibold">Campaign library</h2><p className="mt-1 text-xs text-white/45">{campaigns.length} campaigns loaded</p></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-10 rounded-lg border border-white/10 bg-[#111] px-3 text-xs"><option value="all">All statuses</option>{["draft","pending_approval","approved","scheduled","live","paused","rejected","expired","archived"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
            {loading && campaigns.length === 0 ? <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm text-white/50"><LoaderCircle className="size-5 animate-spin text-[#d4af37]" />Loading campaigns...</div> : filteredCampaigns.length === 0 ? <div className="px-5 py-12 text-center"><Megaphone className="mx-auto mb-3 size-8 text-white/20" /><p className="font-medium">No campaigns here yet</p><p className="mt-1 text-sm text-white/40">Create a draft to begin.</p></div> : <ul className="divide-y divide-white/[0.07]">{filteredCampaigns.map((campaign) => <li key={campaign.id} className="p-4 sm:p-5"><div className="flex gap-3"><div className="size-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">{/* Campaign images are uploaded to the public creative bucket. */}{campaign.media_type === "video" ? <video src={campaign.image_url} muted playsInline preload="metadata" className="size-full object-cover" /> : <img src={campaign.image_url} alt="" className="size-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-medium">{campaign.campaign_name}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusStyles[campaign.status] ?? statusStyles.draft}`}>{campaign.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-white/45">{campaign.advertisers?.business_name ?? "Advertiser"} · {placementLabels[campaign.placement]}</p><p className="mt-1 text-[11px] text-white/35">{formatDate(campaign.starts_at)} → {formatDate(campaign.ends_at)}</p><a href={campaign.destination_url} target={campaign.destination_url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-[11px] text-[#e4c878] hover:underline"><ExternalLink className="size-3 shrink-0" />Preview destination</a></div></div><div className="mt-3 flex flex-wrap gap-2">{["draft","paused","rejected"].includes(campaign.status) && <button type="button" onClick={() => startEditingCampaign(campaign)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/65 hover:bg-white/5"><Plus className="size-3.5" />Edit</button>}{campaign.status === "draft" && <button type="button" disabled={busyCampaign === campaign.id} onClick={() => void changeCampaignStatus(campaign, "submit")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-300/20 px-3 text-xs text-sky-200 hover:bg-sky-300/5 disabled:opacity-50"><Send className="size-3.5" />Submit for approval</button>}{canPublish && ["draft","pending_approval","approved","scheduled","paused"].includes(campaign.status) && <button type="button" disabled={busyCampaign === campaign.id} onClick={() => void changeCampaignStatus(campaign, "publish")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 text-xs font-semibold text-black hover:bg-[#e4c878] disabled:opacity-50">{busyCampaign === campaign.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <BadgeCheck className="size-3.5" />}{campaign.starts_at && new Date(campaign.starts_at) > new Date() ? "Approve & schedule" : "Approve & publish"}</button>}{["live","scheduled","approved"].includes(campaign.status) && <button type="button" disabled={busyCampaign === campaign.id} onClick={() => void changeCampaignStatus(campaign, "pause")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-orange-300/20 px-3 text-xs text-orange-200 hover:bg-orange-300/5 disabled:opacity-50"><Pause className="size-3.5" />Pause</button>}{["draft","pending_approval","paused","rejected","expired"].includes(campaign.status) && <button type="button" disabled={busyCampaign === campaign.id} onClick={() => void changeCampaignStatus(campaign, "archive")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/45 disabled:opacity-50">Archive</button>}</div></li>)}</ul>}
            <div className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-white/40 sm:px-6"><p>Public placements are connected for eligible campaigns. Analytics are best-effort and depend on the event pipeline, attribution session and verified order states.</p>{canViewAnalytics && <p className="mt-1">Analytics permission detected; event reporting will appear when ingestion and attribution are complete.</p>}</div>
          </section>
        </div>
      </div>
    </main>
  )
}
