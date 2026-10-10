
import Link from "next/link"
import { Search, ShoppingBag, ArrowRight } from "lucide-react"
import { products, categories } from "@/lib/data"
import { ProductCard } from "@/components/store/product-card"

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string
    deals?: string
    category?: string
  }>
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams

  const query = (params.q ?? "").trim().toLowerCase()
  const dealsOnly = params.deals === "1"
  const categorySlug = (params.category ?? "").trim().toLowerCase()

  const selectedCategory = categories.find(
    (category) => category.slug.toLowerCase() === categorySlug,
  )

  const filteredProducts = products.filter((product) => {
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

        {query || dealsOnly || categorySlug ? (
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

        {filteredProducts.length > 0 ? (
          <section
            aria-label="Products"
            className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        ) : (
          <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 py-12 text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-full bg-secondary">
              {query ? (
                <Search className="size-6 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ShoppingBag className="size-6 text-muted-foreground" aria-hidden="true" />
              )}
            </div>

            <h2 className="text-xl font-semibold">No products found</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Try another search term or browse all products in the Timora collection.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              View all products
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
