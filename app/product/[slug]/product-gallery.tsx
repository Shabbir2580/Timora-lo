"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Play } from "lucide-react"

type ProductGalleryProps = {
  images: string[]
  videos?: string[]
  productName: string
}

type GalleryItem =
  | { type: "image"; src: string; key: string }
  | { type: "video"; src: string; key: string }

export function ProductGallery({ images, videos = [], productName }: ProductGalleryProps) {
  const galleryItems = useMemo<GalleryItem[]>(() => {
    const uniqueImages = Array.from(
      new Set(images.filter((image) => typeof image === "string" && image.trim()))
    )
    const uniqueVideos = Array.from(
      new Set(videos.filter((video) => typeof video === "string" && video.trim()))
    )

    return [
      ...(uniqueImages.length
        ? uniqueImages.map((src) => ({ type: "image" as const, src, key: `image:${src}` }))
        : [{ type: "image" as const, src: "/placeholder.svg", key: "image:/placeholder.svg" }]),
      ...uniqueVideos.slice(0, 2).map((src) => ({ type: "video" as const, src, key: `video:${src}` })),
    ]
  }, [images, videos])

  const [activeKey, setActiveKey] = useState(galleryItems[0]?.key ?? "image:/placeholder.svg")
  const activeItem = galleryItems.find((item) => item.key === activeKey) ?? galleryItems[0]
  const touchStartX = useRef<number | null>(null)
  const activeIndex = Math.max(0, galleryItems.findIndex((item) => item.key === activeItem?.key))

  function moveGallery(direction: -1 | 1) {
    if (galleryItems.length < 2) return
    const nextIndex = (activeIndex + direction + galleryItems.length) % galleryItems.length
    setActiveKey(galleryItems[nextIndex].key)
  }

  useEffect(() => {
    if (!galleryItems.some((item) => item.key === activeKey)) {
      setActiveKey(galleryItems[0]?.key ?? "image:/placeholder.svg")
    }
  }, [activeKey, galleryItems])

  const isDrivePreview = (src: string) => {
    try {
      const url = new URL(src)
      return (url.hostname === "drive.google.com" || url.hostname.endsWith(".drive.google.com")) && url.pathname.includes("/preview")
    } catch {
      return false
    }
  }

  return (
    <section aria-label={`${productName} media gallery`} className="min-w-0">
      <div
        className="group/gallery relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#f1eee7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e]"
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null || activeItem?.type !== "image") {
            touchStartX.current = null
            return
          }
          const endX = event.changedTouches[0]?.clientX
          const delta = typeof endX === "number" ? endX - touchStartX.current : 0
          if (Math.abs(delta) >= 48) moveGallery(delta < 0 ? 1 : -1)
          touchStartX.current = null
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") { event.preventDefault(); moveGallery(1) }
          if (event.key === "ArrowLeft") { event.preventDefault(); moveGallery(-1) }
        }}
        tabIndex={galleryItems.length > 1 ? 0 : undefined}
        aria-label={galleryItems.length > 1 ? "Product gallery. Swipe or use arrow keys to change media." : undefined}
      >
        {activeItem?.type === "video" ? (
          isDrivePreview(activeItem.src) ? (
            <iframe
              key={activeItem.src}
              src={activeItem.src}
              title={`${productName} product video`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0 bg-black"
            />
          ) : (
            <video
              key={activeItem.src}
              controls
              playsInline
              preload="metadata"
              poster={galleryItems.find((item) => item.type === "image")?.src}
              className="absolute inset-0 h-full w-full bg-black object-contain"
              aria-label={`${productName} product video`}
            >
              <source src={activeItem.src} />
              Your browser does not support embedded video.
            </video>
          )
        ) : (
          <Image
            key={activeItem?.src ?? "/placeholder.svg"}
            src={activeItem?.src ?? "/placeholder.svg"}
            alt={productName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-8 sm:p-14"
          />
        )}

        {galleryItems.length > 1 && (
          <>
            <button type="button" onClick={() => moveGallery(-1)} aria-label="Previous product image" className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/85 text-[#17130c] shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e] sm:opacity-0 sm:group-hover/gallery:opacity-100">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => moveGallery(1)} aria-label="Next product image" className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/85 text-[#17130c] shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e] sm:opacity-0 sm:group-hover/gallery:opacity-100">
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur" aria-live="polite">
              {activeIndex + 1} / {galleryItems.length}
            </span>
          </>
        )}
      </div>

      {galleryItems.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Choose product photo or video">
          {galleryItems.slice(0, 8).map((item, index) => {
            const isActive = activeItem?.key === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveKey(item.key)}
                aria-label={
                  item.type === "video"
                    ? `Play product video ${index + 1} for ${productName}`
                    : `Show product image ${index + 1} for ${productName}`
                }
                aria-pressed={isActive}
                className={`relative aspect-square overflow-hidden rounded-lg border bg-[#f1eee7] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e] ${
                  isActive ? "border-[#c9a96e] ring-1 ring-[#c9a96e]" : "border-white/10 hover:border-[#c9a96e]/60"
                }`}
              >
                {item.type === "image" ? (
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center bg-black text-white">
                    <span className="absolute inset-0 opacity-50" />
                    <Play className="relative z-10 size-7 fill-current drop-shadow" aria-hidden="true" />
                    <span className="absolute bottom-1 left-1 right-1 z-10 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium">
                      VIDEO {index - galleryItems.filter((entry) => entry.type === "image").length + 1}
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
