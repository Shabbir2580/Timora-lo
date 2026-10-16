import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react"
import type { Product, ProductBadge, StockState } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { ProductActions } from "./product-actions"
import { ProductGallery } from "./product-gallery"
import { ProductReviews } from "@/components/store/product-reviews"
import { RelatedProducts } from "@/components/store/related-products"
import { RecentlyViewedProducts } from "@/components/store/recently-viewed-products"
import { ProductCompareToggle } from "@/components/store/product-compare-toggle"

export const dynamic = "force-dynamic"

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
  videos: string[] | null
  tags: string[] | null
  stock: number
  is_active: boolean
}

function toProduct(row: DatabaseProduct): Product {
  const price = Number(row.price)
  const mrp =
    row.compare_at_price == null
      ? price
      : Number(row.compare_at_price)

  const stockCount = Number(row.stock)
  const category = row.category?.trim() || "Accessories"
  const image = row.image_url || row.images?.[0] || "/timora/watch.png"

  const stock: StockState =
    stockCount <= 0
      ? "out_of_stock"
      : stockCount <= 5
        ? "low_stock"
        : "in_stock"

  const explicitlyOnSale = Array.isArray(row.tags) && row.tags.some((tag) => typeof tag === "string" && tag.trim().toLowerCase() === "sale")
  const badges: ProductBadge[] = explicitlyOnSale && Number.isFinite(price) && price >= 0 && Number.isFinite(mrp) && mrp > price ? ["SALE"] : []

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
    images: Array.from(new Set([image, ...(row.images ?? [])].filter(Boolean))).slice(0, 6),
    videos: (row.videos ?? []).filter(Boolean).slice(0, 2),
    badges,
    verified: false,
    stock,
    stockCount,
    deliveryBy: "Delivery estimate shown at checkout",
    freeDelivery: false,
    returnDays: 7,
    colors: [],
    highlights: [],
    specs: [],
    box: [],
    warranty: "See product packaging or contact customer care",
    description: row.description || "A thoughtfully selected product from Timora.",
    reviews: [],
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,description,price,compare_at_price,category,image_url,images,videos,tags,stock,is_active"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    console.error("Product detail lookup failed:", error)
    throw new Error("Unable to load this product. Please try again later.")
  }

  if (!data) notFound()

  const product = toProduct(data as DatabaseProduct)

  // Prefer same-category items, then fill gaps with relevant active products.
  const { data: categoryRows, error: categoryError } = await supabase
    .from("products")
    .select("id,name,slug,description,price,compare_at_price,category,image_url,images,videos,tags,stock,is_active,created_at")
    .eq("is_active", true)
    .eq("category", data.category)
    .neq("id", data.id)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(8)

  let relatedRows = (categoryRows ?? []) as (DatabaseProduct & { created_at?: string })[]
  if (categoryError || relatedRows.length < 4) {
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("products")
      .select("id,name,slug,description,price,compare_at_price,category,image_url,images,videos,tags,stock,is_active,created_at")
      .eq("is_active", true)
      .neq("id", data.id)
      .gt("stock", 0)
      .order("created_at", { ascending: false })
      .limit(40)

    if (!fallbackError && fallbackRows) {
      const existing = new Set(relatedRows.map((row) => row.id))
      const tags = new Set((data.tags ?? []).map((tag: string) => tag.trim().toLowerCase()).filter(Boolean))
      const ranked = (fallbackRows as (DatabaseProduct & { created_at?: string })[])
        .filter((row) => !existing.has(row.id))
        .sort((a, b) => {
          const score = (row: DatabaseProduct) => {
            const sharedTags = (row.tags ?? []).filter((tag) => tags.has(tag.trim().toLowerCase())).length
            const sameCategory = row.category?.toLowerCase() === data.category?.toLowerCase() ? 100 : 0
            const price = Number(row.price)
            const priceSimilarity = Number.isFinite(price) && Number(data.price) > 0
              ? Math.max(0, 30 - Math.abs(price - Number(data.price)) / Number(data.price) * 30)
              : 0
            return sameCategory + sharedTags * 20 + priceSimilarity
          }
          return score(b) - score(a)
        })
      relatedRows = [...relatedRows, ...ranked].slice(0, 8)
    }
  }
  const relatedProducts = relatedRows.map(toProduct)

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f5f1e8]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/products"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 hover:text-[#dfc797]"
        >
          <ArrowLeft size={16} />
          Back to shopping
        </Link>

        <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery
            images={product.images.length ? product.images : [product.image]}
            videos={product.videos}
            productName={product.name}
          />

          <section className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[#c9a96e]">
              {product.category}
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            <p className="mt-5 text-3xl font-semibold">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(product.price)}
            </p>

            {product.badges.includes("SALE") && product.mrp > product.price && (
              <p className="mt-1 text-sm text-white/45 line-through">
                MRP{" "}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(product.mrp)}
              </p>
            )}

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/65">
              {product.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/65">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                <Truck size={15} />
                Delivery details at checkout
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                <ShieldCheck size={15} />
                Order details checked
              </span>
            </div>

            <p
              className={`mt-5 text-sm font-medium ${
                product.stock === "out_of_stock"
                  ? "text-red-300"
                  : product.stock === "low_stock"
                    ? "text-amber-200"
                    : "text-emerald-300"
              }`}
            >
              {product.stock === "out_of_stock"
                ? "Currently out of stock"
                : product.stock === "low_stock"
                  ? "Limited stock available"
                  : "Available to order"}
            </p>

            <ProductActions product={product} />
            <ProductCompareToggle item={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              category: product.category,
              price: product.price,
              mrp: product.mrp,
              image: product.image,
              description: product.description,
              stockCount: product.stockCount ?? 0,
            }} />

            <div className="mt-7 border-t border-white/10 pt-5">
              <h2 className="text-sm font-semibold">Product information</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                For questions about compatibility, warranty or delivery,
                contact Timora customer care before ordering.
              </p>
              <a
                href="https://wa.me/919909231028"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[#c9a96e]/50 px-4 text-sm text-[#dfc797] hover:bg-[#c9a96e]/10"
              >
                Ask customer care
              </a>
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <RelatedProducts products={relatedProducts} currentProductId={product.id} />
        <RecentlyViewedProducts product={{
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.price,
          category: product.category,
        }} />
        <ProductReviews
          productId={product.id}
          productName={product.name}
        />
      </div>
    </main>
  )
}
