"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Clock, TrendingUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { categories } from "@/lib/data"
import { createClient } from "@/lib/supabase/client"

type SearchProduct = {
  id: string
  name: string
  slug: string
  category: string | null
  image_url: string | null
  images: string[] | null
}

const recent = ["wireless headphones", "smartwatch", "mechanical keyboard"]
const popular = ["noise cancelling", "earbuds under 5000", "gaming laptop", "bluetooth speaker"]

export function SearchBar({ className, initialQuery = "", luxury = false }: { className?: string; initialQuery?: string; luxury?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [matches, setMatches] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (!open) return

    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const supabase = createClient()
        const term = query.trim()
        const baseQuery = () => supabase
          .from("products")
          .select("id,name,slug,category,image_url,images")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(4)

        let found: SearchProduct[]
        if (term) {
          // Search both product names and category labels in the live catalogue.
          const escapedTerm = term.replace(/[%_\\]/g, "\\$&")
          const [nameResult, categoryResult] = await Promise.all([
            baseQuery().ilike("name", `%${escapedTerm}%`),
            baseQuery().ilike("category", `%${escapedTerm}%`),
          ])
          if (nameResult.error) throw nameResult.error
          if (categoryResult.error) throw categoryResult.error
          const unique = new Map<string, SearchProduct>()
          for (const product of [...(nameResult.data ?? []), ...(categoryResult.data ?? [])]) {
            unique.set(product.id, product as SearchProduct)
          }
          found = [...unique.values()].slice(0, 4)
        } else {
          const { data, error } = await baseQuery()
          if (error) throw error
          found = (data ?? []) as SearchProduct[]
        }
        if (active) setMatches(found)
      } catch (error) {
        console.error("Could not load live search suggestions:", error)
        if (active) {
          setMatches([])
          setSearchError(true)
        }
      } finally {
        if (active) setLoading(false)
      }
    }, 180)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [open, query])

  function submit(term: string) {
    if (!term.trim()) return
    setOpen(false)
    router.push(`/products?q=${encodeURIComponent(term.trim())}`)
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
        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors focus-within:ring-2", luxury ? "border-white/15 bg-[#11110f] text-[#f5f1e8] focus-within:border-[#d4af37] focus-within:ring-[#d4af37]/20" : "border-input bg-card focus-within:border-ring focus-within:ring-ring/30")}>
          <Search className={cn("size-4 shrink-0", luxury ? "text-white/45" : "text-muted-foreground")} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder="Search products and categories..."
            aria-label="Search products"
            aria-expanded={open}
            aria-controls="timora-search-suggestions"
            className={cn("w-full bg-transparent text-sm outline-none", luxury ? "text-[#f5f1e8] placeholder:text-white/40" : "placeholder:text-muted-foreground")}
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
        <div id="timora-search-suggestions" className={cn("absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain rounded-lg border shadow-lg", luxury ? "border-[#d4af37]/25 bg-[#11110f] text-[#f5f1e8] shadow-black/40" : "border-border bg-popover")}>
          {!query && (
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> Recent searches
                </p>
                <ul className="space-y-1">
                  {recent.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onMouseDown={() => submit(term)}
                        className={cn("w-full rounded px-2 py-1.5 text-left text-sm", luxury ? "hover:bg-white/10" : "hover:bg-accent")}
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="size-3.5" aria-hidden /> Popular searches
                </p>
                <ul className="space-y-1">
                  {popular.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onMouseDown={() => submit(term)}
                        className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className={cn("border-t p-2", luxury ? "border-white/10" : "border-border")}>
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {query ? "Live catalogue matches" : "Recently added products"}
            </p>
            {loading ? (
              <p role="status" className="px-2 py-3 text-sm text-muted-foreground">Searching the live catalogue…</p>
            ) : searchError ? (
              <div className="px-2 py-3">
                <p role="status" className="text-sm text-muted-foreground">Quick suggestions are temporarily unavailable.</p>
                {query.trim() && <button type="button" onMouseDown={() => submit(query)} className={cn("mt-2 text-sm font-medium hover:underline", luxury ? "text-[#f5d76e]" : "text-primary")}>Search all products for “{query.trim()}”</button>}
              </div>
            ) : matches.length === 0 ? (
              <div className="px-2 py-3">
                <p className="text-sm text-muted-foreground">{query.trim() ? `No product names match “${query.trim()}”.` : "No active products are available yet."}</p>
                {query.trim() && <button type="button" onMouseDown={() => submit(query)} className="mt-2 text-sm font-medium text-primary hover:underline">Search the full catalogue</button>}
              </div>
            ) : (
              <ul>
                {matches.map((product) => {
                  const image = product.image_url || product.images?.[0] || "/placeholder.svg"
                  return (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        onMouseDown={() => setOpen(false)}
                        className={cn("flex items-center gap-3 rounded px-2 py-2", luxury ? "hover:bg-white/10" : "hover:bg-accent")}
                      >
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded bg-secondary">
                          <Image src={image} alt="" width={40} height={40} unoptimized className="size-10 object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category || "Timora collection"}</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            {query.trim() && !searchError && (
              <button type="button" onMouseDown={() => submit(query)} className={cn("mt-1 w-full rounded px-2 py-2 text-left text-xs font-medium", luxury ? "text-[#f5d76e] hover:bg-white/10" : "text-primary hover:bg-accent")}>
                View all results for “{query.trim()}” →
              </button>
            )}
          </div>

          {!query && (
            <div className="flex flex-wrap gap-2 border-t border-border p-3">
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category.slug}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  onMouseDown={() => setOpen(false)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium", luxury ? "border-white/15 hover:bg-white/10" : "border-border hover:bg-accent")}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
