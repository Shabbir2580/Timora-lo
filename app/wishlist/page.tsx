"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Heart, ShoppingBag, LoaderCircle, RefreshCw, AlertCircle, Trash2, ShoppingCart } from "lucide-react"
import type { Product, ProductBadge, StockState } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { ProductCard } from "@/components/store/product-card"
import { createClient } from "@/lib/supabase/client"

type DatabaseProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number | string
  compare_at_price: number | string | null
  category: string | null
  image_url: string | null
  images: string[] | null
  tags: string[] | null
  stock: number
  is_active: boolean
}

function toProduct(row: DatabaseProduct): Product {
  const price = Number(row.price)
  const mrp = row.compare_at_price == null ? price : Number(row.compare_at_price)
  const stockCount = Number(row.stock)
  const category = row.category?.trim() || "Accessories"
  const image = row.image_url || row.images?.[0] || "/timora/watch.png"
  const stock: StockState =
    stockCount <= 0 ? "out_of_stock" : stockCount <= 5 ? "low_stock" : "in_stock"
  const explicitlyOnSale = Array.isArray(row.tags) && row.tags.some((tag) => tag.trim().toLowerCase() === "sale")
  const badges: ProductBadge[] = explicitlyOnSale && Number.isFinite(mrp) && mrp > price ? ["SALE"] : []

  return {
    id: row.id,
    slug: row.slug,
    brand: "Timora",
    name: row.name,
    category,
    categorySlug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    price,
    mrp,
    rating: 0,
    reviewCount: 0,
    image,
    images: row.images?.length ? row.images : [image],
    badges,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    verified: false,
    stock,
    stockCount,
    deliveryBy: "Check delivery at checkout",
    freeDelivery: false,
    returnDays: 7,
    colors: [],
    highlights: [],
    specs: [],
    box: [],
    warranty: "See product details",
    description: row.description || "Discover this product from Timora.",
    reviews: [],
  }
}

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useCart()
  const [bulkAddMessage, setBulkAddMessage] = useState("")
  const [databaseProducts, setDatabaseProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [retryCount, setRetryCount] = useState(0)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setLoadError("")

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,description,price,compare_at_price,category,image_url,images,tags,stock,is_active")
        .eq("is_active", true)

      if (error) throw error
      setDatabaseProducts(((data ?? []) as DatabaseProduct[]).map(toProduct))
    } catch (error) {
      console.error("Wishlist products could not be loaded:", error)
      setLoadError("We couldn't load your saved products. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts, retryCount])

  const savedProducts = databaseProducts.filter((product) => wishlist.includes(product.id))

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/products"
          className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Continue shopping
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full border border-border bg-card">
            <Heart className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Wishlist</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your saved products, all in one place.</p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">
            {loading || loadError ? " " : `${savedProducts.length} ${savedProducts.length === 1 ? "product" : "products"} saved`}
          </p>
          {!loading && !loadError && savedProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const available = savedProducts.filter((product) => product.stock !== "out_of_stock")
                  if (!available.length) {
                    setBulkAddMessage("No saved products are currently in stock.")
                    return
                  }
                  available.forEach((product) => addToCart(product))
                  setBulkAddMessage(`${available.length} available ${available.length === 1 ? "product was" : "products were"} added to your bag. Review quantities and totals in your cart.`)
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4af37] px-3 text-xs font-semibold text-[#17130c] transition hover:bg-[#f5d76e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ShoppingCart className="size-3.5" />
                Add available to bag
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Remove all saved products from your wishlist?")) {
                    savedProducts.forEach((product) => toggleWishlist(product.id))
                  }
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/55 transition hover:border-red-300/30 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Trash2 className="size-3.5" />
                Clear wishlist
              </button>
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                Explore more
              </Link>
            </div>
          )}
        </div>

        {bulkAddMessage && <p role="status" className="mb-4 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3 py-2 text-sm text-[#dfc797]">{bulkAddMessage}</p>}

        {loading ? (
          <div role="status" className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading saved products…
          </div>
        ) : loadError ? (
          <section role="alert" className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-red-500/25 bg-red-500/5 px-5 py-12 text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-full bg-red-500/10">
              <AlertCircle className="size-6 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">Your wishlist couldn't load</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{loadError}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <RefreshCw className="size-4" />
              Try again
            </button>
          </section>
        ) : savedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {savedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-5 py-12 text-center">
            <div className="mb-5 grid size-16 place-items-center rounded-full bg-secondary">
              <Heart className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Your wishlist is empty</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Found something you love? Tap the heart on any product to save it here for later.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <ShoppingBag className="size-4" />
              Explore Timora
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
