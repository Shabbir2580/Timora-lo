"use client"

import { useState } from "react"
import { Check, Copy, Share2 } from "lucide-react"

export function ProductShareButton({ name, url }: { name: string; url: string }) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  async function shareProduct() {
    setBusy(true)
    setMessage("")
    try {
      const shareUrl = new URL(url, window.location.origin).toString()
      if (typeof navigator.share === "function") {
        await navigator.share({ title: name, text: `Take a look at ${name} on Timora`, url: shareUrl })
        setMessage("Product shared.")
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setMessage("Product link copied.")
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(new URL(url, window.location.origin).toString())
        setMessage("Product link copied.")
      } catch {
        setMessage("Sharing is unavailable in this browser. Copy the product URL from the address bar.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void shareProduct()}
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3.5 text-xs text-white/65 transition hover:border-[#c9a96e]/50 hover:text-[#dfc797] disabled:opacity-50"
      >
        {message === "Product link copied." ? <Check size={14} /> : message === "Product shared." ? <Check size={14} /> : <Share2 size={14} />}
        {busy ? "Preparing…" : message === "Product link copied." ? "Link copied" : message === "Product shared." ? "Shared" : "Share product"}
        {message === "" && <Copy size={12} />}
      </button>
      {message && <p role="status" className="mt-2 text-xs text-white/50">{message}</p>}
    </div>
  )
}
