"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function getSessionKey() {
  try {
    const key = "timora_ad_session"
    const current = sessionStorage.getItem(key)
    if (current) return current
    const created = crypto.randomUUID()
    sessionStorage.setItem(key, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

async function recordCampaignEvent(campaign: PublicCampaign, eventType: "impression" | "click") {
  const eventKey = crypto.randomUUID()
  const sessionKey = getSessionKey()
  try {
    const supabase = createClient()
    const { error } = await supabase.rpc("record_ad_event", {
      p_event_key: eventKey,
      p_campaign_id: campaign.id,
      p_event_type: eventType,
      p_placement: campaign.placement,
      p_product_id: campaign.product_id,
      p_order_id: null,
      p_click_id: eventType === "click" ? eventKey : null,
      p_session_key: sessionKey,
    })
    if (error) return
    if (eventType === "click") {
      try {
        sessionStorage.setItem("timora_last_ad_click", JSON.stringify({ campaignId: campaign.id, clickId: eventKey, placement: campaign.placement, productId: campaign.product_id, at: Date.now() }))
      } catch {
        // Attribution remains best-effort when session storage is unavailable.
      }
    }
  } catch {
    // Analytics failure must never block navigation or shopping.
  }
}

type Placement = "homepage_hero" | "featured_product" | "category_banner" | "deals_banner" | "homepage_secondary"
type PublicCampaign = {
  id: string
  campaign_type: "timora_promotion" | "featured_product" | "external_ad"
  placement: Placement
  headline: string | null
  description: string | null
  image_url: string
  destination_url: string
  product_id: string | null
  starts_at: string | null
  ends_at: string | null
}

type Props = { placement: Placement; className?: string }

function isInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
}

export function AdPlacement({ placement, className = "" }: Props) {
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const placementRef = useRef<HTMLElement | null>(null)
  const impressionRecorded = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("ad_public_campaigns")
          .select("id,campaign_type,placement,headline,description,image_url,destination_url,product_id,starts_at,ends_at")
          .eq("placement", placement)
          .limit(1)
        if (error) throw error
        if (!active) return
        const now = Date.now()
        const eligible = ((data ?? []) as PublicCampaign[]).find((item) =>
          (!item.starts_at || new Date(item.starts_at).getTime() <= now) &&
          (!item.ends_at || new Date(item.ends_at).getTime() > now)
        )
        setCampaign(eligible ?? null)
      } catch {
        // Advertising is an optional storefront enhancement. A missing migration or
        // unavailable campaign service must not break the shopping experience.
        if (active) setCampaign(null)
      }
    }
    void load()
    return () => { active = false }
  }, [placement])

  useEffect(() => {
    if (!campaign || !placementRef.current || impressionRecorded.current === campaign.id) return
    const node = placementRef.current
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
        impressionRecorded.current = campaign.id
        void recordCampaignEvent(campaign, "impression")
        observer.disconnect()
      }
    }, { threshold: [0.5] })
    observer.observe(node)
    return () => observer.disconnect()
  }, [campaign])

  if (!campaign) return null

  const label = campaign.campaign_type === "external_ad"
    ? "Advertisement"
    : campaign.campaign_type === "featured_product"
      ? "Featured"
      : "Timora promotion"
  const destination = campaign.destination_url
  const external = !isInternalPath(destination)

  return (
    <section ref={placementRef} aria-label={label} className={`mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 ${className}`}>
      <div className="group relative isolate overflow-hidden rounded-2xl border border-[#c9a96e]/25 bg-[#10100e]">
        <div className="absolute inset-0 -z-10">
          <img src={campaign.image_url} alt="" aria-hidden="true" className="size-full object-cover opacity-35 transition duration-700 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0a] via-[#0b0b0a]/85 to-[#0b0b0a]/25" />
        </div>
        <div className="grid min-h-48 gap-5 p-5 sm:min-h-56 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8 lg:p-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a96e]/30 bg-black/25 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#e5cb91]"><Sparkles size={12} />{label}</span>
            {campaign.headline && <h2 className="mt-4 text-2xl font-light leading-tight tracking-tight text-[#f7f1e5] sm:text-3xl lg:text-4xl">{campaign.headline}</h2>}
            {campaign.description && <p className="mt-3 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">{campaign.description}</p>}
          </div>
          <div className="flex items-end sm:items-center sm:justify-end">
            {external ? (
              <a href={destination} onClick={() => void recordCampaignEvent(campaign, "click")} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-xs font-semibold text-[#17140b] transition hover:bg-[#e4c878]">Explore promotion <ArrowUpRight size={15} /></a>
            ) : (
              <Link href={destination} onClick={() => void recordCampaignEvent(campaign, "click")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-xs font-semibold text-[#17140b] transition hover:bg-[#e4c878]">Explore promotion <ArrowUpRight size={15} /></Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
