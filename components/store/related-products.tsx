import type { Product } from "@/lib/data"
import { ProductCard } from "@/components/store/product-card"

export function RelatedProducts({ products, currentProductId }: { products: Product[]; currentProductId: string }) {
  const recommendations = products
    .filter((product) => product.id !== currentProductId && product.stock !== "out_of_stock")
    .slice(0, 4)

  if (!recommendations.length) return null

  return (
    <section className="mt-12 border-t border-white/10 pt-8 sm:mt-16 sm:pt-10" aria-labelledby="related-products-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c9a96e]">Curated for you</p>
          <h2 id="related-products-heading" className="mt-2 text-2xl font-semibold">Similar products</h2>
          <p className="mt-2 text-sm text-white/50">Explore more from this category and discover a close match.</p>
        </div>
        <a href="/products" className="inline-flex min-h-10 items-center text-sm text-[#dfc797] hover:text-white">Explore all products →</a>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {recommendations.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  )
}
