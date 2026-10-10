
"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  RotateCcw,
  Package,
  Star,
} from "lucide-react"

import { products } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { ProductCard } from "@/components/store/product-card"

export default function ProductDetailsPage() {
  const params = useParams<{ slug: string }>()
  const product = products.find((item) => item.slug === params.slug)

  const { addToCart, wishlist, toggleWishlist } = useCart()

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState("description")

  if (!product) {
    return (
      <main className="flex min-h-[65vh] flex-col items-center justify-center px-5 text-center">
        <Package className="mb-4 size-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This product may have been removed or the link may be incorrect.
        </p>
        <Link
          href="/products"
          className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Browse all products
        </Link>
      </main>
    )
  }

  const outOfStock = product.stock === "out_of_stock"
  const wished = wishlist.includes(product.id)
  const images = product.images.length > 0 ? product.images : [product.image]
  const currentImage = images[Math.min(selectedImage, images.length - 1)]
  const relatedProducts = products
    .filter(
      (item) =>
        item.id !== product.id &&
        item.categorySlug === product.categorySlug,
    )
    .slice(0, 4)

  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0

  function handleAddToCart() {
    if (outOfStock) return

    addToCart(
      product,
      selectedColor || product.colors[0] || "Default",
      quantity,
    )
    setAdded(true)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="size-3.5" />
          <Link
            href={`/products?category=${encodeURIComponent(product.categorySlug)}`}
            className="hover:text-foreground"
          >
            {product.category}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="max-w-48 truncate text-foreground">
            {product.name}
          </span>
        </nav>

        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Continue shopping
        </Link>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <section aria-label="Product images" className="min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card">
              <Image
                src={currentImage || "/placeholder.svg"}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-6 sm:p-10"
              />

              {discount > 0 && (
                <span className="absolute left-4 top-4 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  SAVE {discount}%
                </span>
              )}

              {product.verified && (
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-2 text-xs font-medium">
                  <ShieldCheck className="size-4 text-primary" />
                  Verified listing
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImage === index}
                    className={`relative size-20 shrink-0 overflow-hidden rounded-lg border bg-card sm:size-24 ${
                      selectedImage === index
                        ? "border-primary ring-1 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <Image
                      src={src || "/placeholder.svg"}
                      alt={`${product.name} view ${index + 1}`}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {product.brand}
            </p>

            <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-sm font-semibold text-white">
                {product.rating.toFixed(1)}
                <Star className="size-3.5 fill-current" />
              </span>
              <span className="text-sm text-muted-foreground">
                {product.reviewCount} ratings
              </span>
              {product.verified && (
                <span className="text-xs font-medium text-emerald-600">
                  Verified listing
                </span>
              )}
            </div>

            <div className="my-6 border-y border-border py-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-bold">
                  {product.price.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  })}
                </span>

                {product.mrp > product.price && (
                  <>
                    <span className="text-base text-muted-foreground line-through">
                      {product.mrp.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {discount}% off
                    </span>
                  </>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Displayed price from the current catalogue. Final charges, if
                any, should be confirmed at checkout.
              </p>
            </div>

            <p className="text-sm leading-7 text-muted-foreground">
              {product.description}
            </p>

            {product.colors.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold">
                  Colour:{" "}
                  <span className="font-normal text-muted-foreground">
                    {selectedColor || product.colors[0]}
                  </span>
                </p>

                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const active =
                      (selectedColor || product.colors[0]) === color

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color)
                          setAdded(false)
                        }}
                        aria-pressed={active}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        {active && <Check className="size-4 text-primary" />}
                        {color}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Quantity</p>

              <div className="flex items-center gap-4">
                <div className="inline-flex h-11 items-center rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setQuantity((value) => Math.max(1, value - 1))
                      setAdded(false)
                    }}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="grid size-10 place-items-center disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>

                  <span
                    aria-live="polite"
                    className="min-w-8 text-center text-sm font-semibold"
                  >
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setQuantity((value) =>
                        Math.min(
                          product.stock === "low_stock"
                            ? product.stockCount ?? 1
                            : 99,
                          value + 1,
                        ),
                      )
                      setAdded(false)
                    }}
                    disabled={
                      quantity >=
                      (product.stock === "low_stock"
                        ? product.stockCount ?? 1
                        : 99)
                    }
                    aria-label="Increase quantity"
                    className="grid size-10 place-items-center disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <span
                  className={`text-sm font-medium ${
                    outOfStock
                      ? "text-destructive"
                      : product.stock === "low_stock"
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}
                >
                  {outOfStock
                    ? "Out of stock"
                    : product.stock === "low_stock"
                      ? `Only ${product.stockCount ?? "a few"} left`
                      : "In stock"}
                </span>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {outOfStock ? (
                  "Currently unavailable"
                ) : added ? (
                  <>
                    <Check className="size-5" />
                    Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="size-5" />
                    Add to cart
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-pressed={wished}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold hover:bg-accent"
              >
                <Heart
                  className={`size-5 ${wished ? "fill-current text-primary" : ""}`}
                />
                {wished ? "Saved" : "Wishlist"}
              </button>
            </div>

            <div className="mt-7 divide-y divide-border rounded-xl border border-border">
              <div className="flex items-start gap-3 p-4">
                <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Delivery information</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estimated date listed: {product.deliveryBy}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Delivery dates are catalogue estimates and must be
                    confirmed for your address.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <RotateCcw className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">
                    {product.returnDays}-day return listing
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check the final return eligibility and conditions before
                    placing an order.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Warranty</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.warranty}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-14 border-t border-border pt-8 sm:mt-20">
          <div className="flex flex-wrap gap-2 border-b border-border">
            {[
              { id: "description", label: "Highlights" },
              { id: "specifications", label: "Specifications" },
              { id: "box", label: "What's in the box" },
              { id: "reviews", label: `Reviews (${product.reviews.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={`border-b-2 px-4 py-3 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-6">
            {activeTab === "description" && (
              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold">Product highlights</h2>
                <ul className="mt-4 space-y-3">
                  {product.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                    >
                      <Check className="mt-1 size-4 shrink-0 text-primary" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="max-w-3xl overflow-hidden rounded-xl border border-border">
                {product.specs.map((spec, index) => (
                  <div
                    key={spec.label}
                    className={`grid grid-cols-2 gap-4 px-4 py-3 text-sm ${
                      index % 2 === 0 ? "bg-card" : "bg-background"
                    }`}
                  >
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "box" && (
              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold">Included in the box</h2>
                <ul className="mt-4 space-y-3">
                  {product.box.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Package className="size-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="max-w-3xl space-y-4">
                {product.reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No written reviews are available yet.
                  </p>
                ) : (
                  product.reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-border p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold">{review.title}</h3>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                          {review.rating} <Star className="size-3 fill-current" />
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {review.body}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{review.author}</span>
                        <span>·</span>
                        <span>{review.date}</span>
                        {review.verified && (
                          <span className="text-emerald-600">
                            · Verified buyer label
                          </span>
                        )}
                      </div>
                    </article>
                  ))
                )}
                <p className="text-xs text-muted-foreground">
                  These are catalogue review entries. Customer-submitted reviews
                  and photo uploads require a connected review system.
                </p>
              </div>
            )}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-12 border-t border-border pt-10 sm:mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  YOU MAY ALSO LIKE
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  More in {product.category}
                </h2>
              </div>
              <Link
                href={`/products?category=${encodeURIComponent(product.categorySlug)}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
