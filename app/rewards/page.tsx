"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowUpRight, Check, Copy, Gift, History, Link2, Sparkles, Users, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type RewardEntry = {
  id: string
  order_id: string
  points: number
  entry_type: "order_earned" | "referral_bonus_referrer" | "referral_bonus_friend"
  created_at: string
}

type RewardsSummary = {
  referral_code: string | null
  points_balance: number
  referral_count: number
  entries: RewardEntry[]
  earning_rule: string
  referral_rule: string
}

const entryLabels: Record<RewardEntry["entry_type"], string> = {
  order_earned: "Delivered order reward",
  referral_bonus_referrer: "Friend's first order bonus",
  referral_bonus_friend: "Welcome referral bonus",
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default function RewardsPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<RewardsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<"code" | "link" | null>(null)
  const [siteOrigin, setSiteOrigin] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.replace("/login?next=%2Frewards")
        return
      }
      const { data, error: rpcError } = await supabase.rpc("get_my_rewards_summary")
      if (rpcError) {
        if (rpcError.message.toLowerCase().includes("get_my_rewards_summary") || rpcError.code === "PGRST202") {
          throw new Error("Rewards are not active in the database yet. The site owner must apply the Timora loyalty and referral migration.")
        }
        throw rpcError
      }
      setSummary(data as RewardsSummary)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewards could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { setSiteOrigin(window.location.origin); void load() }, [load])

  async function copyValue(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setError("Clipboard access was blocked. Select and copy the referral text manually.")
    }
  }

  const referralLink = summary?.referral_code && siteOrigin
    ? siteOrigin + "/register?ref=" + encodeURIComponent(summary.referral_code)
    : ""

  return (
    <main className="min-h-screen bg-[#0b0b0a] px-4 py-8 text-[#f5f1e8] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/account" className="inline-flex min-h-10 items-center gap-2 text-sm text-white/60 transition hover:text-[#e3ca96]"><ArrowLeft className="size-4"/> My account</Link>
        <header className="mt-6">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a96e]"><Sparkles className="size-4"/> Timora rewards</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Good things come around.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base">Earn points from completed purchases and invite friends to discover Timora. Rewards are added only after an order is paid and delivered.</p>
        </header>

        {error && <p role="alert" className="mt-6 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{error}</p>}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/10 p-8 text-center text-sm text-white/50">Loading your rewards…</div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl border border-[#c9a96e]/30 bg-gradient-to-br from-[#c9a96e]/15 to-[#15140f] p-5 sm:p-6">
                <Wallet className="size-5 text-[#d9bd83]"/>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/45">Points earned</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums text-[#e4cd9b]">{Number(summary?.points_balance ?? 0).toLocaleString("en-IN")}</p>
                <p className="mt-2 text-xs text-white/40">Lifetime points balance</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <Users className="size-5 text-[#c9a96e]"/>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/45">Friends invited</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums">{Number(summary?.referral_count ?? 0).toLocaleString("en-IN")}</p>
                <p className="mt-2 text-xs text-white/40">Using your referral code</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <Gift className="size-5 text-[#c9a96e]"/>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/45">Referral bonus</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums">+100</p>
                <p className="mt-2 text-xs text-white/40">For each eligible first order, for both of you</p>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-[#c9a96e]/25 bg-[#15140f] p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#c9a96e]/25 bg-[#c9a96e]/10 text-[#e4cd9b]"><Link2 className="size-5"/></div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">Invite a friend</h2>
                  <p className="mt-1 text-sm leading-6 text-white/50">Share your code when a friend creates an account. Once their first order is paid and delivered, both accounts receive 100 bonus points.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Your referral code</p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="min-w-0 flex-1 break-all text-xl font-semibold tracking-[0.18em] text-[#e4cd9b]">{summary?.referral_code || "Not available"}</p>
                    <button type="button" disabled={!summary?.referral_code} onClick={() => summary?.referral_code && void copyValue(summary.referral_code, "code")} aria-label="Copy referral code" className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 text-white/70 transition hover:border-[#c9a96e]/50 hover:text-[#e4cd9b] disabled:opacity-40">{copied === "code" ? <Check className="size-4"/> : <Copy className="size-4"/>}</button>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Share registration link</p>
                  <button type="button" disabled={!referralLink} onClick={() => void copyValue(referralLink, "link")} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#c9a96e] px-4 text-sm font-semibold text-[#17130c] transition hover:bg-[#dfc797] disabled:opacity-40">{copied === "link" ? <Check className="size-4"/> : <Copy className="size-4"/>}{copied === "link" ? "Copied" : "Copy referral link"}</button>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">Points are currently tracked in your account and cannot yet be redeemed at checkout. Invalid referral codes are ignored; referral rewards require a genuine new account and its first paid, delivered order.</p>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-2"><History className="size-5 text-[#c9a96e]"/><h2 className="text-xl font-semibold">Points activity</h2></div>
              {!summary?.entries?.length ? (
                <div className="mt-4 rounded-2xl border border-white/10 p-7 text-center"><Gift className="mx-auto size-7 text-[#c9a96e]/70"/><p className="mt-3 font-medium">Your rewards journey starts here</p><p className="mt-1 text-sm text-white/45">Complete a purchase and wait for delivery to earn points.</p><Link href="/products" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#c9a96e]/35 px-4 text-sm text-[#e4cd9b] hover:bg-[#c9a96e]/10">Explore products <ArrowUpRight className="size-4"/></Link></div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  {summary.entries.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-2 border-b border-white/[0.07] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0"><p className="text-sm font-medium">{entryLabels[entry.entry_type] ?? "Rewards activity"}</p><p className="mt-1 text-xs text-white/40">{formatDate(entry.created_at)}{entry.entry_type === "order_earned" ? ` · Order #${entry.order_id.slice(0, 8).toUpperCase()}` : ""}</p></div>
                      <p className="shrink-0 text-sm font-semibold text-[#e4cd9b]">+{entry.points} pts</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-xl border border-white/[0.08] p-4 text-xs leading-6 text-white/45">
              <p className="font-semibold text-white/70">How points work</p>
              <p>• Earn 1 point per ₹100 on eligible paid and delivered orders.</p>
              <p>• Earn 100 bonus points when your invited friend completes their first paid and delivered order; your friend receives 100 too.</p>
              <p>• Points are not cash and cannot currently be redeemed for discounts. Redemption will be enabled only after checkout supports it.</p>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
