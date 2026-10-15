
import Link from "next/link"
import { Search, ShoppingBag, ArrowRight } from "lucide-react"
import {
  categories,
  type Product,
  type ProductBadge,
  type StockState,
} from "@/lib/data"
import { ProductCard } from "@/components/store/product-card"
import { createClient } from "@/lib/supabase/server"

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string
    deals?: string
    category?: string
    sort?: string
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
  stock: number
  is_active: boolean
}

function toProduct(row: DatabaseProduct): Product {
  const category = row.category?.trim() || "Accessories"
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const price = Number(row.price)
  const mrp =
    row.compare_at_price == null ? price : Number(row.compare_at_price)
  const stockCount = Number(row.stock)
  const image = row.image_url || row.images?.[0] || "/timora/watch.png"

  const stock: StockState =
    stockCount <= 0
      ? "out_of_stock"
      : stockCount <= 5
        ? "low_stock"
        : "in_stock"

  const badges: ProductBadge[] = mrp > price ? ["SALE"] : []

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
    description:
      row.description || "Discover this product from the Timora collection.",
    reviews: [],
  }
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams
  const query = (params.q ?? "").trim().toLowerCase()
  const dealsOnly = params.deals === "1"
  const categorySlug = (params.category ?? "").trim().toLowerCase()
  const sort = (params.sort ?? "newest").trim().toLowerCase()

  let databaseProducts: Product[] = []
  let databaseError = false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,slug,description,price,compare_at_price,category,image_url,images,stock,is_active"
      )
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

  const selectedCategory = categories.find(
    (category) => category.slug.toLowerCase() === categorySlug
  )

  const filteredProducts = databaseProducts.filter((product) => {
    const matchesQuery =
      !query ||
      [
        product.name,
        product.brand,
        product.category,
        product.categorySlug,
        ...product.highlights,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)

    const matchesDeals =
      !dealsOnly ||
      product.badges.includes("SALE") ||
      product.price < product.mrp

    const matchesCategory =
      !categorySlug || product.categorySlug.toLowerCase() === categorySlug

    return matchesQuery && matchesDeals && matchesCategory
  })

  const sortedProducts = [...filteredProducts]

  if (sort === "price-asc") {
    sortedProducts.sort((a, b) => a.price - b.price)
  } else if (sort === "price-desc") {
    sortedProducts.sort((a, b) => b.price - a.price)
  } else if (sort === "name") {
    sortedProducts.sort((a, b) => a.name.localeCompare(b.name))
  }

  const heading = selectedCategory
    ? selectedCategory.name
    : dealsOnly
      ? "Today's Deals"
      : query
        ? "Search Results"
        : "Explore All Products"

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{heading}</span>
        </nav>

        <section className="mb-8 rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                TIMORA COLLECTION
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {heading}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {query
                  ? `Products matching “${params.q}”.`
                  : dealsOnly
                    ? "Discover products with listed savings."
                    : "Explore the products available in our current catalogue."}
              </p>
            </div>

            <p className="shrink-0 text-sm text-muted-foreground">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>
        </section>

        {databaseError && (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6"
          >
            The live catalogue could not be loaded. Please try again later.
          </p>
        )}

        {!databaseError && databaseProducts.length === 0 && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6"
          >
            No active products are available in the live catalogue yet. Add
            your real products through the admin catalogue before accepting
            live orders.
          </p>
        )}

        <section aria-label="Product categories" className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Browse categories</h2>
            <Link
              href="/products"
              className="text-sm text-primary hover:underline"
            >
              All products
            </Link>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const active = categorySlug === category.slug

              return (
                <Link
                  key={category.slug}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {category.name}
                </Link>
              )
            })}
          </div>
        </section>

        {query || dealsOnly || categorySlug || sort !== "newest" ? (
          <div className="mb-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Clear filters
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sort products</p>

          <form
            action="/products"
            method="get"
            className="flex flex-wrap items-center gap-2"
          >
            {query && <input type="hidden" name="q" value={params.q} />}
            {dealsOnly && <input type="hidden" name="deals" value="1" />}
            {categorySlug && (
              <input type="hidden" name="category" value={categorySlug} />
            )}

            <label htmlFor="product-sort" className="sr-only">
              Sort products
            </label>

            <select
              id="product-sort"
              name="sort"
              defaultValue={sort}
              className="min-h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>

            <button
              type="submit"
              className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Apply
            </button>
          </form>
        </div>

        {sortedProducts.length > 0 ? (
          <section
            aria-label="Products"
            className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          >
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        ) : (
          <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 py-12 text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-full bg-secondary">
              {query ? (
                <Search
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <ShoppingBag
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>

            <h2 className="text-xl font-semibold">
              {databaseError ? "Catalogue unavailable" : "No products found"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {databaseError
                ? "We could not load the catalogue. Please try again later."
                : "Try another search term or browse all products in the Timora collection."}
            </p>

            {!databaseError && (
              <Link
                href="/products"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                View all products
              </Link>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
