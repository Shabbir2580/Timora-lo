"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Copy, ExternalLink, Image as ImageIcon, Link2, LoaderCircle, ShieldCheck, WandSparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const DRIVE_HOSTS = new Set(["drive.google.com", "www.drive.google.com"])

function getDriveFileId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (!DRIVE_HOSTS.has(url.hostname.toLowerCase())) return null

    const pathMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i)
    const id = pathMatch?.[1] || url.searchParams.get("id") || ""
    return /^[a-zA-Z0-9_-]{10,200}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export default function AdminImageUrlConverterPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [sourceUrl, setSourceUrl] = useState("")
  const [convertedUrl, setConvertedUrl] = useState("")
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    async function verifyAccess() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.replace("/login?next=%2Fadmin%2Fimage-url-converter")
          return
        }
        const { data: staff, error: roleError } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!active) return
        if (roleError || !staff || !["admin", "employee"].includes(staff.role)) {
          setAuthorized(false)
          setCheckingAccess(false)
          return
        }
        setAuthorized(true)
        setCheckingAccess(false)
      } catch {
        if (active) {
          setAuthorized(false)
          setCheckingAccess(false)
        }
      }
    }
    void verifyAccess()
    return () => { active = false }
  }, [router])

  function convertUrl() {
    setError("")
    setCopied(false)
    setImageLoaded(false)
    setImageFailed(false)
    setConvertedUrl("")

    const value = sourceUrl.trim()
    if (!value) {
      setError("Paste a Google Drive image sharing link first.")
      return
    }

    const fileId = getDriveFileId(value)
    if (!fileId) {
      setError("This doesn't look like a single Google Drive image link. Use a link such as drive.google.com/file/d/FILE_ID/view, and make sure the file is shared with anyone who has the link.")
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const proxyUrl = new URL("/api/drive-image", baseUrl)
    proxyUrl.searchParams.set("id", fileId)
    setConvertedUrl(proxyUrl.toString())
  }

  async function copyUrl() {
    if (!convertedUrl) return
    try {
      await navigator.clipboard.writeText(convertedUrl)
      setCopied(true)
    } catch {
      setError("Clipboard access was blocked. Select and copy the URL from the result field.")
    }
  }

  if (checkingAccess) {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]"><p className="inline-flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" /> Verifying staff access...</p></main>
  }

  if (!authorized) {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] px-5 text-[#f8f8f8]"><div className="max-w-md text-center"><ShieldCheck className="mx-auto mb-4 size-10 text-[#d4af37]" /><h1 className="text-xl font-semibold">Staff access required</h1><p className="mt-2 text-sm text-white/60">Sign in with an authorized Timora staff account to use the image URL converter.</p><Link href="/admin" className="mt-5 inline-flex min-h-10 items-center rounded-full bg-[#d4af37] px-4 text-sm font-semibold text-[#17130c]">Back to admin</Link></div></main>
  }

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]">
      <header className="border-b border-[#d4af37]/20 bg-[#0b0b0a]/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/admin/products" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-sm text-white/75 transition hover:border-[#d4af37]/40 hover:text-white"><ArrowLeft className="size-4" /> Products</Link>
          <p className="text-sm font-semibold tracking-[0.16em]">TIMORA<span className="text-[#d4af37]">.</span></p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e4c878]"><WandSparkles className="size-3.5" /> Store management tool</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Image URL Converter</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Convert a Google Drive sharing link into a Timora image URL, preview it, and copy it into a product's main image or additional images field.</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#11110f] p-5 sm:p-7">
          <label htmlFor="drive-image-url" className="block text-sm font-medium text-white/85">Google Drive image sharing link</label>
          <textarea id="drive-image-url" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setError(""); setCopied(false) }} placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing" rows={3} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d4af37]" />
          <p className="mt-2 text-xs leading-5 text-white/40">Before converting, open Google Drive → Share → General access → Anyone with the link → Viewer.</p>
          <button type="button" onClick={convertUrl} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] transition hover:bg-[#e6c85c] sm:w-auto"><Link2 className="size-4" /> Convert image link</button>

          {error && <p role="alert" className="mt-4 rounded-lg border border-red-300/20 bg-red-300/[0.06] px-3 py-2.5 text-sm text-red-200">{error}</p>}

          {convertedUrl && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-emerald-300" /> Converted URL</div>
              <textarea aria-label="Converted image URL" readOnly value={convertedUrl} rows={3} onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full resize-y rounded-xl border border-emerald-300/20 bg-black/30 px-3 py-3 text-xs leading-5 text-emerald-100 outline-none" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={copyUrl} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4af37] px-4 text-sm font-semibold text-[#17130c] hover:bg-[#e6c85c]"><Copy className="size-4" /> {copied ? "Copied!" : "Copy URL"}</button>
                <a href={convertedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/80 hover:border-[#d4af37]/40"><ExternalLink className="size-4" /> Open image URL</a>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/50"><ImageIcon className="size-4" /> Image preview</div>
                {!imageLoaded && !imageFailed && <p className="py-8 text-center text-sm text-white/40">Loading preview…</p>}
                {imageFailed && <div className="py-6 text-center"><p className="text-sm text-red-200">The image could not be loaded.</p><p className="mt-2 text-xs leading-5 text-white/45">Check that the file is shared publicly and that the Drive link points to an image file, not a folder or document.</p></div>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={convertedUrl} src={convertedUrl} alt="Converted Google Drive image preview" onLoad={() => { setImageLoaded(true); setImageFailed(false) }} onError={() => { setImageLoaded(false); setImageFailed(true) }} className={imageLoaded ? "mx-auto max-h-[420px] max-w-full rounded-lg object-contain" : "hidden"} />
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">Copy this URL into Timora's image field. The URL uses Timora's image proxy, so the original Google Drive file must remain publicly accessible.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
