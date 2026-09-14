"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Clock, TrendingUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { products, categories } from "@/lib/data"

const recent = ["wireless headphones", "smartwatch", "mechanical keyboard"]
const popular = ["noise cancelling", "earbuds under 5000", "gaming laptop", "bluetooth speaker"]

export function SearchBar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = query
    ? products.filter((p) => `${p.brand} ${p.name}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : products.slice(0, 3)

  function submit(term: string) {
    if (!term.trim()) return
    setOpen(false)
    router.push(`/products?q=${encodeURIComponent(term)}`)
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(query)
        }}
        role="search"
      >
        <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search products, brands and categories..."
            aria-label="Search products"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {!query && (
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> Recent
                </p>
                <ul className="space-y-1">
                  {recent.map((t) => (
                    <li key={t}>
                      <button
                        onMouseDown={() => submit(t)}
                        className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="size-3.5" aria-hidden /> Popular
                </p>
                <ul className="space-y-1">
                  {popular.map((t) => (
                    <li key={t}>
                      <button
                        onMouseDown={() => submit(t)}
                        className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="border-t border-border p-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {query ? "Products" : "Popular products"}
            </p>
            {matches.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No products match “{query}”. Try a different term.
              </p>
            ) : (
              <ul>
                {matches.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/product/${p.slug}`}
                      onMouseDown={() => setOpen(false)}
                      className="flex items-center gap-3 rounded px-2 py-2 hover:bg-accent"
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded bg-secondary">
                        <Image src={p.image || "/placeholder.svg"} alt="" width={32} height={32} className="object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!query && (
            <div className="flex flex-wrap gap-2 border-t border-border p-3">
              {categories.slice(0, 5).map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  onMouseDown={() => setOpen(false)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
