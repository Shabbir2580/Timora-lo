"use client"

import { useEffect, useState } from "react"

type SmartImageProps = {
  src: string
  alt: string
  className?: string
  fill?: boolean
  priority?: boolean
  sizes?: string
  loading?: "eager" | "lazy"
}

function getImageCandidates(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return ["/placeholder.svg"]
  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    if (host === "drive.google.com" || host.endsWith(".drive.google.com")) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/i)
      const id = match?.[1] || url.searchParams.get("id") || ""
      if (id) {
        const encodedId = encodeURIComponent(id)
        // Google Drive can respond differently depending on which public-image endpoint is used.
        return Array.from(new Set([
          `/api/drive-image?id=${encodedId}`,
          `https://drive.google.com/thumbnail?id=${encodedId}&sz=w2000`,
          `https://drive.google.com/uc?export=view&id=${encodedId}`,
          `https://drive.google.com/uc?export=download&id=${encodedId}`,
        ]))
      }
    }
    return [trimmed]
  } catch {
    return [trimmed]
  }
}

export function normalizeImageUrl(value: string) {
  return getImageCandidates(value)[0]
}

export function SmartImage({ src, alt, className = "", fill = false, priority = false, loading }: SmartImageProps) {
  const candidates = getImageCandidates(src)
  const [candidateIndex, setCandidateIndex] = useState(0)
  useEffect(() => setCandidateIndex(0), [src])
  const currentSrc = candidateIndex >= candidates.length ? "/placeholder.svg" : candidates[candidateIndex] || "/placeholder.svg"
  const layoutClass = fill ? "absolute inset-0 h-full w-full" : "max-w-full"

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${layoutClass} ${className}`.trim()}
      onError={() => {
        if (candidateIndex < candidates.length - 1) setCandidateIndex((index) => index + 1)
        else setCandidateIndex(candidates.length)
      }}
      data-image-source={src}
    />
  )
}
