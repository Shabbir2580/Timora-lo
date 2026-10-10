
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react"
import { categories, products } from "@/lib/data"
import { Hero } from "@/components/store/hero"
import { CategoryCard } from "@/components/store/category-card"
import { ProductCard } from "@/components/store/product-card"
import { Section, SectionHeader } from "@/components/store/section"
import { TrustStrip } from "@/components/store/trust-strip"
import { Newsletter } from "@/components/store/newsletter"

export default function HomePage() {
  const featuredProducts = products
    .filter((product) => product.stock !== "out_of_stock")
    .slice(0, 4)

  const newProducts = products
    .filter((product) => product.badges.includes("NEW"))
    .slice(0, 4)

  const popularProducts = products
    .filter((product) => product.badges.includes("BESTSELLER"))
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-[#0b0b0a] text-[#f5f1e8]">
      {/* Premium hero */}
      <section className="relative overflow-hidden border-b border-[#c9a96e]/15">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-0 h-[440px] w-[440px] rounded-full bg-[#c9a96e]/10 blur-[120px]"
        />
        <div className="relative">
          <Hero />
        </div>
      </section>

      {/* Shopping benefits */}
      <TrustStrip />

      {/* Categories */}
      <Section>
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#c9a96e]">
              Find your style
            </p>
            <h2 className="mt-2 text-2xl font-light tracking-tight sm:text-3xl">
              Explore <span className="font-medium">categories.</span>
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
              Browse everyday essentials and thoughtfully selected technology.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-2 text-xs text-[#dfc797] transition hover:gap-3 sm:inline-flex"
          >
            Shop all <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>

        <Link
          href="/products"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#c9a96e]/30 text-xs font-medium text-[#dfc797] sm:hidden"
        >
          Explore all products <ArrowRight className="size-4" />
        </Link>
      </Section>

      {/* Featured products */}
      <Section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#c9a96e]">
              Selected for you
            </p>
            <h2 className="mt-2 text-2xl font-light tracking-tight sm:text-3xl">
              The <span className="font-medium">collection.</span>
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Discover customer favourites and everyday essentials.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex shrink-0 items-center gap-2 text-xs text-[#dfc797] transition hover:gap-3"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">
            Products will appear here when the catalogue is ready.
          </p>
        )}
      </Section>

      {/* Editorial banner */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-[#c9a96e]/20 bg-[#151512]">
          <div className="grid items-center gap-6 sm:grid-cols-2">
            <div className="relative z-10 px-6 py-8 sm:px-9 sm:py-12 lg:px-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c9a96e]/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[#dfc797]">
                <Sparkles className="size-3.5" />
                The Timora edit
              </span>
              <h2 className="mt-5 max-w-md text-3xl font-light leading-tight tracking-tight sm:text-4xl">
                Thoughtful choices.
                <br />
                <span className="font-medium text-[#d8bc88]">
                  Everyday impact.
                </span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/55">
                Find technology and accessories designed to fit your routines,
                your work and your personal style.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-full bg-[#c9a96e] px-5 text-xs font-semibold text-[#17130c] transition hover:bg-[#dfc797]"
              >
                Discover the collection
                <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <div className="relative mx-4 mb-4 aspect-[5/3] overflow-hidden rounded-xl bg-[#201e18] sm:mx-4 sm:mb-4 sm:mt-4 sm:aspect-[4/5]">
              <Image
                src="/timora/hero.png"
                alt="A featured product from the Timora collection"
                fill
                sizes="(max-width: 640px) 90vw, 45vw"
                className="object-contain p-4 transition duration-500 hover:scale-105 sm:p-7"
              />
            </div>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      {newProducts.length > 0 && (
        <Section>
          <SectionHeader
            title="Fresh arrivals"
            subtitle="Explore products marked as new in the catalogue."
            href="/products?sort=newest"
            hrefLabel="Explore all"
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* Bestsellers */}
      {popularProducts.length > 0 && (
        <Section>
          <SectionHeader
            title="Customer favourites"
            subtitle="Products marked as bestsellers in the current catalogue."
            href="/products"
            hrefLabel="Shop all"
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* Newsletter */}
      <Newsletter />
    </div>
  )
}
