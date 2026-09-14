import { StoreShell } from "@/components/store/store-shell"
import { Hero } from "@/components/store/hero"
import { TrustStrip } from "@/components/store/trust-strip"
import { Section, SectionHeader } from "@/components/store/section"
import { CategoryCard } from "@/components/store/category-card"
import { ProductCard } from "@/components/store/product-card"
import { FlashSale } from "@/components/store/flash-sale"
import { WhyTimora } from "@/components/store/why-timora"
import { Newsletter } from "@/components/store/newsletter"
import { categories, products } from "@/lib/data"

export default function HomePage() {
  const dedupe = (list: typeof products) =>
    Array.from(new Map(list.map((p) => [p.id, p])).values())

  const featured = products.slice(0, 4)
  const newArrivals = dedupe([
    ...products.filter((p) => p.badges.includes("NEW")),
    ...products.slice(4, 8),
  ]).slice(0, 4)
  const bestSellers = dedupe([
    ...products.filter((p) => p.badges.includes("BESTSELLER")),
    ...products,
  ]).slice(0, 4)

  return (
    <StoreShell>
      <Hero />
      <TrustStrip />

      <Section>
        <SectionHeader title="Shop by category" subtitle="Browse Timora's verified catalog" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} />
          ))}
        </div>
      </Section>

      <FlashSale products={products.filter((p) => p.mrp > p.price).slice(0, 4)} />

      <Section>
        <SectionHeader title="Featured products" href="/products" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader title="New arrivals" subtitle="Just added to the store" href="/products?sort=newest" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader title="Best sellers" subtitle="Most loved by Timora customers" href="/products?sort=popularity" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>

      <WhyTimora />
      <Newsletter />
    </StoreShell>
  )
}
