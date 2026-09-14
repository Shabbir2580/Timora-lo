import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-accent-foreground">
        <div className="grid items-center gap-6 p-8 sm:p-12 lg:grid-cols-2">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              Timora Festival
            </span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Better products. Better prices.
            </h1>
            <p className="mt-3 max-w-md text-pretty text-base text-primary-foreground/85">
              Up to 40% off on verified electronics. Genuine invoices, clear delivery dates and
              easy 7-day returns.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/products?deals=1"
                className="inline-flex items-center gap-2 rounded-lg bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-card/90"
              >
                Shop Deals
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/category/headphones"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-white/10"
              >
                Explore Categories
              </Link>
            </div>
          </div>
          <div className="relative hidden aspect-4/3 lg:block">
            <Image
              src="/timora/hero.png"
              alt="Featured premium headphones"
              fill
              priority
              sizes="(max-width: 1024px) 0px, 50vw"
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
