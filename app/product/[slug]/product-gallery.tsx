"use client"

import Image from "next/image"
import { useState } from "react"

type ProductGalleryProps = {
  images: string[]
  videos?: string[]
  productName: string
}

function normalizeImageUrl(value: string) {
  const trimmed = value.trim()
  // Drive's /file/d/.../view URL is a preview page, not an image URL.
  const driveMatch = trimmed.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/?#]+)/i)
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`
  return trimmed
}

function GalleryImage({
  src,
  alt,
  priority = false,
  thumbnail = false,
}: {
  src: string
  alt: string
  priority?: boolean
  thumbnail?: boolean
}) {
  const normalizedSrc = normalizeImageUrl(src)
  const className = thumbnail ? "object-contain p-2" : "object-contain p-8 sm:p-14"

  // Remote hosts (including Drive and image-hosting services) should load directly.
  // next/image requires remote host allowlisting and can otherwise show a blank image.
  if (/^https?:\/\//i.test(normalizedSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizedSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        className={`absolute inset-0 h-full w-full ${className}`}
      />
    )
  }

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={thumbnail ? "120px" : "(max-width: 768px) 100vw, 50vw"}
      className={className}
    />
  )
}

export function ProductGallery({ images, videos = [], productName }: ProductGalleryProps) {
  const uniqueImages = Array.from(
    new Set(images.filter((image) => typeof image === "string" && image.trim()).map(normalizeImageUrl)),
  )
  const galleryImages = uniqueImages.length ? uniqueImages : ["/placeholder.svg"]
  const [activeImage, setActiveImage] = useState(galleryImages[0])

  return (
    <section aria-label={`${productName} image gallery`} className="min-w-0">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#f1eee7]">
        <GalleryImage key={activeImage} src={activeImage} alt={productName} priority />
      </div>

      {galleryImages.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Choose product image">
          {galleryImages.slice(0, 8).map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              aria-label={`Show image ${index + 1} of ${productName}`}
              aria-pressed={activeImage === image}
              className={`relative aspect-square overflow-hidden rounded-lg border bg-[#f1eee7] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e] ${
                activeImage === image ? "border-[#c9a96e] ring-1 ring-[#c9a96e]" : "border-white/10 hover:border-[#c9a96e]/60"
              }`}
            >
              <GalleryImage src={image} alt="" thumbnail />
            </button>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <section className="mt-6" aria-label={`${productName} product videos`}>
          <h2 className="mb-3 text-sm font-semibold text-white/80">Product videos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.slice(0, 2).map((video, index) => (
              <div key={video} className="overflow-hidden rounded-xl border border-white/10 bg-black">
                <video controls preload="metadata" playsInline className="aspect-video w-full" aria-label={`${productName} video ${index + 1}`}>
                  <source src={video} />
                  Your browser does not support embedded video.
                </video>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
