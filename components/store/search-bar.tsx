"use client"

import { useEffect, useId, useRef, useState } from "react"
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
  const suggestionsId = useId()

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

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
          .limit(5)

        let found: SearchProduct[]
        if (term) {
          // Match multi-word searches using the same all-words rule as the catalogue.
          const terms = term.split(/\s+/).filter(Boolean).slice(0, 5)
          const escapedTerms = terms.map((word) => word.replace(/[%_\\]/g, "\\$&"))
          const matchesByWord = await Promise.all(escapedTerms.map(async (word) => {
            const pattern = `%${word}%`
            const [nameResult, categoryResult] = await Promise.all([
              supabase.from("products").select("id,name,slug,category,image_url,images").eq("is_active", true).ilike("name", pattern).order("created_at", { ascending: false }).limit(100),
              supabase.from("products").select("id,name,slug,category,image_url,images").eq("is_active", true).ilike("category", pattern).order("created_at", { ascending: false }).limit(100),
            ])
            if (nameResult.error) throw nameResult.error
            if (categoryResult.error) throw categoryResult.error
            return new Map([...((nameResult.data ?? []) as SearchProduct[]), ...((categoryResult.data ?? []) as SearchProduct[])].map((product) => [product.id, product]))
          }))
          const firstWordMatches = matchesByWord[0] ?? new Map<string, SearchProduct>()
          found = [...firstWordMatches.values()]
            .filter((product) => matchesByWord.every((products) => products.has(product.id)))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 5)
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
        <div className={cn(
          "group flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 transition-all duration-200 focus-within:ring-2",
          luxury
            ? "border-[#d4af37]/30 bg-[#11110f]/95 text-[#f5f1e8] shadow-[0_4px_18px_rgba(0,0,0,0.16)] focus-within:border-[#d4af37] focus-within:bg-[#15140f] focus-within:ring-[#d4af37]/20"
            : "border-input bg-card focus-within:border-ring focus-within:ring-ring/30"
        )}>
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
            aria-controls={suggestionsId}
            className={cn("min-w-0 w-full bg-transparent text-sm outline-none", luxury ? "text-[#f5f1e8] placeholder:text-white/45" : "placeholder:text-muted-foreground")}
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
        <div id={suggestionsId} className={cn(
          "absolute top-full z-[80] mt-2 max-h-[min(72vh,560px)] overflow-y-auto overscroll-contain rounded-2xl border shadow-[0_24px_70px_rgba(0,0,0,0.62)]",
          luxury
            ? "right-0 left-auto w-[min(420px,calc(100vw-24px))] border-[#d4af37]/30 bg-[#11110f] text-[#f5f1e8] ring-1 ring-white/[0.04]"
            : "left-0 right-0 border-border bg-popover"
        )}>
          {!query && (
            <div className={cn("grid gap-4 p-4 sm:grid-cols-2", luxury && "bg-gradient-to-br from-[#d4af37]/[0.06] via-transparent to-transparent")}>
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
                        className={cn("w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors", luxury ? "text-white/75 hover:bg-[#d4af37]/10 hover:text-[#f5d76e]" : "hover:bg-accent")}
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
                        className={cn("w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors", luxury ? "text-white/75 hover:bg-[#d4af37]/10 hover:text-[#f5d76e]" : "hover:bg-accent")}
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className={cn("border-t p-3", luxury ? "border-white/10 bg-[#0d0d0b]/70" : "border-border")}>
            <p className={cn("px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]", luxury ? "text-[#d4af37]" : "text-muted-foreground")}>
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
                <p className="text-sm text-muted-foreground">{query.trim() ? `No products match “${query.trim()}”.` : "No active products are available yet."}</p>
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
                        className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors", luxury ? "hover:bg-white/[0.06]" : "hover:bg-accent")}
                      >
                        <div className={cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border", luxury ? "border-white/10 bg-[#1b1913]" : "border-border bg-secondary")}>
                          <Image src={image} alt="" width={48} height={48} unoptimized className="size-12 object-contain p-1" />
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
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", luxury ? "border-[#d4af37]/25 bg-white/[0.02] text-white/75 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 hover:text-[#f5d76e]" : "border-border hover:bg-accent")}
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
