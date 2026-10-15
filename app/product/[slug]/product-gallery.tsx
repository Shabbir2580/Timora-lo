"use client"

import Image from "next/image"
import { useState } from "react"

type ProductGalleryProps = {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const uniqueImages = Array.from(new Set(images.filter((image) => typeof image === "string" && image.trim())))
  const galleryImages = uniqueImages.length ? uniqueImages : ["/placeholder.svg"]
  const [activeImage, setActiveImage] = useState(galleryImages[0])

  return (
    <section aria-label={`${productName} image gallery`} className="min-w-0">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#f1eee7]">
        <Image
          key={activeImage}
          src={activeImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-8 sm:p-14"
        />
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
              <Image
                src={image}
                alt=""
                fill
                sizes="120px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
