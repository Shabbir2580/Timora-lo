import Link from "next/link"
import { ArrowDownUp, ArrowRight, Check, ChevronRight, Search, ShoppingBag, SlidersHorizontal, Sparkles, Tag } from "lucide-react"
import {
  categories,
  type Product,
  type ProductBadge,
  type StockState,
} from "@/lib/data"
import { ProductCard } from "@/components/store/product-card"
import { AdPlacement } from "@/components/store/ad-placement"
import { createClient } from "@/lib/supabase/server"

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string
    deals?: string
    category?: string
    sort?: string
    minPrice?: string
    maxPrice?: string
    inStock?: string
  }>
}

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
  const category = row.category?.trim() || "Accessories"
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const price = Number(row.price)
  const mrp = row.compare_at_price == null ? price : Number(row.compare_at_price)
  const stockCount = Number(row.stock)
  const image = row.image_url || row.images?.[0] || "/timora/watch.png"
  const stock: StockState = stockCount <= 0 ? "out_of_stock" : stockCount <= 5 ? "low_stock" : "in_stock"
  const explicitlyOnSale = Array.isArray(row.tags) && row.tags.some((tag) => typeof tag === "string" && tag.trim().toLowerCase() === "sale")
  const badges: ProductBadge[] = explicitlyOnSale && Number.isFinite(price) && price >= 0 && Number.isFinite(mrp) && mrp > price ? ["SALE"] : []

  return {
    id: row.id,
    slug: row.slug,
    brand: "Timora",
    name: row.name,
    category,
    categorySlug,
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
    description: row.description || "Discover this product from the Timora collection.",
    reviews: [],
  }
}

function buildProductsUrl(values: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `/products?${query}` : "/products"
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const query = (params.q ?? "").trim().toLowerCase()
  const dealsOnly = params.deals === "1"
  const categorySlug = (params.category ?? "").trim().toLowerCase()
  const sort = (params.sort ?? "newest").trim().toLowerCase()
  const minPrice = params.minPrice?.trim() ? Number(params.minPrice) : null
  const maxPrice = params.maxPrice?.trim() ? Number(params.maxPrice) : null
  const inStockOnly = params.inStock === "1"
  const validMinPrice = minPrice !== null && Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : null
  const validMaxPrice = maxPrice !== null && Number.isFinite(maxPrice) && maxPrice >= 0 ? maxPrice : null
  const filterValues = {
    q: params.q?.trim() || undefined,
    deals: dealsOnly ? "1" : undefined,
    category: categorySlug || undefined,
    sort: sort !== "newest" ? sort : undefined,
    minPrice: validMinPrice !== null ? String(validMinPrice) : undefined,
    maxPrice: validMaxPrice !== null ? String(validMaxPrice) : undefined,
    inStock: inStockOnly ? "1" : undefined,
  }

  let databaseProducts: Product[] = []
  let databaseError = false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,description,price,compare_at_price,category,image_url,images,tags,stock,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Could not load catalogue products:", error.message)
      databaseError = true
    } else {
      databaseProducts = ((data ?? []) as DatabaseProduct[]).map(toProduct)
    }
  } catch (error) {
    console.error("Could not connect to the product catalogue:", error)
    databaseError = true
  }

  const selectedCategory = categories.find((category) => category.slug.toLowerCase() === categorySlug)
  const filteredProducts = databaseProducts.filter((product) => {
    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.categorySlug,
      product.description,
      ...product.tags,
      ...product.highlights,
    ].join(" ").toLowerCase()
    const matchesQuery = !query || searchableText.includes(query)
    const matchesDeals = !dealsOnly || product.badges.includes("SALE")
    const productCategorySlug = product.categorySlug.toLowerCase()
    const matchesCategory = !categorySlug || (
      categorySlug === "attar"
        ? ["attar", "ittar", "attar-ittar", "fragrance", "perfume-oils"].includes(productCategorySlug)
        : productCategorySlug === categorySlug
    )
    const matchesMinPrice = validMinPrice === null || product.price >= validMinPrice
    const matchesMaxPrice = validMaxPrice === null || product.price <= validMaxPrice
    const matchesStock = !inStockOnly || product.stock !== "out_of_stock"
    return matchesQuery && matchesDeals && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesStock
  })

  const sortedProducts = [...filteredProducts]
  if (sort === "price-asc") sortedProducts.sort((a, b) => a.price - b.price)
  else if (sort === "price-desc") sortedProducts.sort((a, b) => b.price - a.price)
  else if (sort === "name") sortedProducts.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === "discount") {
    sortedProducts.sort((a, b) => {
      const discount = (product: Product) => product.mrp > product.price && product.mrp > 0 ? (product.mrp - product.price) / product.mrp : 0
      return discount(b) - discount(a)
    })
  } else if (sort === "availability") {
    sortedProducts.sort((a, b) => Number(b.stock !== "out_of_stock") - Number(a.stock !== "out_of_stock"))
  }

  const heading = selectedCategory ? selectedCategory.name : dealsOnly ? "Today's Deals" : query ? "Search Results" : "Explore All Products"
  const activeFilterCount = Number(Boolean(query)) + Number(dealsOnly) + Number(Boolean(categorySlug)) + Number(validMinPrice !== null) + Number(validMaxPrice !== null) + Number(inStockOnly)
  const clearUrl = buildProductsUrl({ q: params.q?.trim() || undefined })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-foreground">{heading}</span>
        </nav>

        <section className="relative mb-6 overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-[#10100e] px-5 py-7 sm:mb-8 sm:px-8 sm:py-10 lg:px-11">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-[#d4af37]/10 blur-3xl sm:size-80" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-[22%] h-px w-2/5 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e5cb91] sm:text-xs">
                <Sparkles className="size-3.5" aria-hidden="true" /> Timora collection
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">{heading}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                {query
                  ? `Showing products matching “${params.q?.trim()}”.`
                  : dealsOnly
                    ? "Discover marked-down pieces and find your next favourite."
                    : selectedCategory
                      ? `Explore our ${selectedCategory.name.toLowerCase()} collection.`
                      : "Thoughtfully selected essentials. Find your next favourite from the Timora collection."}
              </p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 md:self-auto">
              <div className="grid size-10 place-items-center rounded-lg bg-[#d4af37]/10 text-[#e5cb91]"><ShoppingBag className="size-5" aria-hidden="true" /></div>
              <div>
                <p className="text-xl font-semibold tabular-nums text-white">{filteredProducts.length}</p>
                <p className="text-xs text-white/50">{filteredProducts.length === 1 ? "product found" : "products found"}</p>
              </div>
            </div>
          </div>
        </section>

        {databaseError && (
          <div role="alert" className="mb-6 flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="leading-6">We couldn’t load the live catalogue right now. Your filters are preserved—please try again.</p>
            <Link href={buildProductsUrl(filterValues)} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-red-400/30 px-4 font-semibold hover:bg-red-500/10">Try again <ArrowRight className="ml-2 size-4" /></Link>
          </div>
        )}

        {!databaseError && databaseProducts.length === 0 && (
          <p role="status" className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-4 text-sm leading-6">
            No active products are available in the live catalogue yet. Add products through the admin catalogue before accepting live orders.
          </p>
        )}

        <section aria-label="Product categories" className="mb-6 sm:mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold sm:text-base">Shop by category</h2>
              <p className="mt-1 text-xs text-muted-foreground">Find the right collection faster</p>
            </div>
            <Link href={buildProductsUrl({ q: params.q?.trim() || undefined })} className="shrink-0 text-xs font-semibold text-primary hover:underline sm:text-sm">View all</Link>
          </div>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={buildProductsUrl({ q: params.q?.trim() || undefined, deals: dealsOnly ? "1" : undefined, sort: sort !== "newest" ? sort : undefined, minPrice: validMinPrice !== null ? String(validMinPrice) : undefined, maxPrice: validMaxPrice !== null ? String(validMaxPrice) : undefined, inStock: inStockOnly ? "1" : undefined })} aria-current={!categorySlug ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${!categorySlug ? "border-[#d4af37] bg-[#d4af37] text-[#17130c]" : "border-border bg-card hover:border-[#d4af37]/50"}`}>All products</Link>
            {categories.map((category) => {
              const active = categorySlug === category.slug.toLowerCase()
              return (
                <Link key={category.slug} href={buildProductsUrl({ ...filterValues, category: category.slug, deals: dealsOnly ? "1" : undefined })} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${active ? "border-[#d4af37] bg-[#d4af37] text-[#17130c]" : "border-border bg-card hover:border-[#d4af37]/50 hover:bg-accent"}`}>
                  {category.name}
                </Link>
              )
            })}
          </div>
        </section>

        {dealsOnly ? <AdPlacement placement="deals_banner" className="mb-6" /> : categorySlug && !query ? <AdPlacement placement="category_banner" className="mb-6" /> : null}

        <section aria-label="Filter and sort products" className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.08] text-primary"><SlidersHorizontal className="size-5" aria-hidden="true" /></div>
              <div>
                <h2 className="text-sm font-semibold">Refine your results</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : "Choose a price range or sort your products"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dealsOnly && <Link href={buildProductsUrl({ ...filterValues, deals: undefined })} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#d4af37]/30 px-3 text-xs text-primary"><Tag className="size-3.5" /> Deals <span aria-hidden="true">×</span></Link>}
              {categorySlug && <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs">{selectedCategory?.name ?? categorySlug}</span>}
              {activeFilterCount > 0 && <Link href={clearUrl} className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground">Clear filters</Link>}
            </div>
          </div>
          <form action="/products" method="get" className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-6">
            {query && <input type="hidden" name="q" value={params.q?.trim()} />}
            {dealsOnly && <input type="hidden" name="deals" value="1" />}
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Minimum price (₹)
              <input name="minPrice" inputMode="numeric" type="number" min="0" max="100000000" defaultValue={validMinPrice ?? ""} placeholder="No minimum" className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Maximum price (₹)
              <input name="maxPrice" inputMode="numeric" type="number" min="0" max="100000000" defaultValue={validMaxPrice ?? ""} placeholder="No maximum" className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ArrowDownUp className="size-3.5" /> Sort by</span>
              <select name="sort" defaultValue={["newest", "price-asc", "price-desc", "discount", "availability", "name"].includes(sort) ? sort : "newest"} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15">
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="discount">Biggest discount</option>
                <option value="availability">In-stock first</option>
                <option value="name">Name: A to Z</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border px-3 text-sm text-foreground sm:self-end">
              <input type="checkbox" name="inStock" value="1" defaultChecked={inStockOnly} className="size-4 accent-[#d4af37]" />
              In-stock only
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
              <button type="submit" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><Check className="size-4" /> Apply filters</button>
              <Link href={clearUrl} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:border-[#d4af37]/50 hover:bg-accent">Reset</Link>
            </div>
          </form>
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{query ? "Search results" : dealsOnly ? "Offers worth a look" : selectedCategory ? `${selectedCategory.name} collection` : "All products"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Showing {sortedProducts.length} of {databaseProducts.length} active products</p>
          </div>
          <p className="text-xs text-muted-foreground">Prices shown in INR</p>
        </div>

        {sortedProducts.length > 0 ? (
          <section aria-label="Products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
            {sortedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </section>
        ) : (
          <section className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-5 py-12 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/[0.08] text-primary">
              {query ? <Search className="size-7" aria-hidden="true" /> : <ShoppingBag className="size-7" aria-hidden="true" />}
            </div>
            <h2 className="text-xl font-semibold">{databaseError ? "Catalogue unavailable" : "No products match these filters"}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {databaseError ? "We couldn’t load the catalogue. Try again in a moment." : "Try a different search, broaden the price range, or remove a filter to see more products."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {!databaseError && <Link href={clearUrl} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">Clear filters</Link>}
              <Link href="/products" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold hover:border-[#d4af37]/50">Browse all products</Link>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
