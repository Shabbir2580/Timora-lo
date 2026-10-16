"use client"

type SmartImageProps = {
  src: string
  alt: string
  className?: string
  fill?: boolean
  priority?: boolean
  sizes?: string
  loading?: "eager" | "lazy"
}

/** Normalizes common share links and renders remote URLs without Next Image host allowlists. */
export function normalizeImageUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return "/placeholder.svg"
  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    if (host === "drive.google.com" || host.endsWith(".drive.google.com")) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/i)
      const id = match?.[1] || url.searchParams.get("id") || ""
      if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000`
    }
    return trimmed
  } catch { return trimmed }
}

export function SmartImage({ src, alt, className = "", fill = false, priority = false, loading }: SmartImageProps) {
  const normalizedSrc = normalizeImageUrl(src)
  const layoutClass = fill ? "absolute inset-0 h-full w-full" : "max-w-full"
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizedSrc}
      alt={alt}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${layoutClass} ${className}`.trim()}
      onError={(event) => {
        const image = event.currentTarget
        if (image.dataset.fallbackApplied === "true") return
        image.dataset.fallbackApplied = "true"
        image.src = "/placeholder.svg"
      }}
    />
  )
}
