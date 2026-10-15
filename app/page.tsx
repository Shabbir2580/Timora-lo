"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useCart } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Headphones,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Package,
  UserRound,
  LogOut,
  Sparkles,
  Truck,
  Watch,
  X,
  Zap,
} from "lucide-react"

const categories = [
  { name: "Watches", detail: "Timeless essentials", icon: Watch, href: "/products?category=watches" },
  { name: "Headphones", detail: "Hear every detail", icon: Headphones, href: "/products?category=headphones" },
  { name: "Accessories", detail: "The finishing touch", icon: Sparkles, href: "/products?category=accessories" },
  { name: "New arrivals", detail: "Freshly discovered", icon: Zap, href: "/products?sort=newest" },
]

type FeaturedProduct = {
  id: string
  slug: string
  name: string
  category: string
  price: number
  stock: number
  oldPrice: number | null
  badge: string
  image: string
  tags?: string[]
  tone: string
}


const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price)

export default function HomePage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [catalogueFallback, setCatalogueFallback] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100, visible: false })
  const { wishlist, toggleWishlist } = useCart()

  useEffect(() => {
    const supabase = createClient()
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user); setAuthChecked(true) }
    }).catch(() => { if (active) setAuthChecked(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const move = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setCursorPosition({ x: event.clientX, y: event.clientY, visible: true }))
    }
    const leave = () => setCursorPosition((current) => ({ ...current, visible: false }))
    window.addEventListener("pointermove", move, { passive: true })
    document.addEventListener("pointerleave", leave)
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); if (frame) cancelAnimationFrame(frame) }
  }, [])

  async function handleHomeSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return
    setUser(null)
    setAccountMenuOpen(false)
    router.refresh()
  }

  useEffect(() => {
    let active = true
    async function loadFeaturedProducts() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("products")
          .select("id,name,slug,category,price,compare_at_price,image_url,images,tags,stock,created_at,is_active")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(8)
        if (error) throw error
        if (!active) return
        if (data?.length) {
          setFeaturedProducts(data.map((row, index) => {
            const price = Number(row.price)
            const compareAt = row.compare_at_price == null ? price : Number(row.compare_at_price)
            return {
              id: row.id,
              slug: row.slug,
              name: row.name,
              category: row.category || "Accessories",
              price,
              stock: Number(row.stock ?? 0),
              oldPrice: compareAt > price ? compareAt : null,
              badge: compareAt > price ? "SALE" : "CURATED",
              tags: Array.isArray(row.tags) ? row.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
              image: row.image_url || row.images?.[0] || "/timora/watch.png",
              tone: ["bg-[#e8e1d6]", "bg-[#e7e5df]", "bg-[#e9e1d6]", "bg-[#e6e3dc]"][index % 4],
            }
          }))
          setCatalogueFallback(false)
        } else {
          setFeaturedProducts([])
          setCatalogueFallback(true)
        }
      } catch (error) {
        console.error("Homepage catalogue lookup failed:", error)
        if (active) {
          setFeaturedProducts([])
          setCatalogueFallback(true)
        }
      }
    }
    void loadFeaturedProducts()
    return () => { active = false }
  }, [])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return featuredProducts.filter((product) => {
      const categoryName = product.category.trim().toLowerCase()
      const matchesCategory =
        activeCategory === "All" ||
        categoryName === activeCategory.toLowerCase() ||
        (activeCategory === "Headphones" && ["headphones", "earbuds", "speakers", "audio", "audio accessories"].includes(categoryName)) ||
        (activeCategory === "Accessories" && ["accessories", "keyboards", "lifestyle accessories"].includes(categoryName))
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, search, featuredProducts])

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b0a] text-[#f5f1e8]">\n      <div aria-hidden="true" className={`timora-cursor-ring ${cursorPosition.visible ? "is-visible" : ""}`} style={{ left: cursorPosition.x, top: cursorPosition.y }} />
      {/* Announcement bar */}
      <div className="border-b border-white/10 bg-[#c9a96e] px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.19em] text-[#17130c] sm:text-xs">
        Discover your next favourite · Explore the Timora collection
      </div>

      {/* Navigation */}
      <header className="relative z-30 border-b border-white/10 bg-[#0b0b0a]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full border border-white/15 p-2.5 transition hover:border-[#c9a96e] lg:hidden"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <Link href="/" className="group flex shrink-0 flex-col">
            <span className="text-2xl font-semibold tracking-[0.2em] sm:text-3xl">
              TIMORA<span className="text-[#c9a96e]">.</span>
            </span>
            <span className="mt-0.5 text-[8px] uppercase tracking-[0.32em] text-white/45 sm:text-[9px]">
              Curated for your lifestyle
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <Link href="/" className="text-xs text-white/80 transition hover:text-[#d8bc88]">
              Home
            </Link>
            <Link href="/products" className="text-xs text-white/60 transition hover:text-[#d8bc88]">
              Shop all
            </Link>
            <Link href="/products?category=watches" className="text-xs text-white/60 transition hover:text-[#d8bc88]">
              Watches
            </Link>
            <Link href="/products?category=headphones" className="text-xs text-white/60 transition hover:text-[#d8bc88]">
              Audio
            </Link>
            <Link href="/products?sort=newest" className="text-xs text-white/60 transition hover:text-[#d8bc88]">
              New arrivals
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                const query = search.trim()
                if (query) router.push(`/products?q=${encodeURIComponent(query)}`)
                else router.push("/products")
              }}
              className="hidden items-center gap-2 rounded-full border border-white/15 px-3 py-2.5 focus-within:border-[#c9a96e] md:flex"
            >
              <Search size={15} className="text-white/45" aria-hidden="true" />
              <input
                aria-label="Search all products"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  document.getElementById("featured-products")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }}
                placeholder="Search collection"
                className="w-32 bg-transparent text-xs outline-none placeholder:text-white/35 lg:w-40"
              />
              <button
                type="submit"
                aria-label="Search catalogue"
                className="rounded-full p-1 text-white/60 transition hover:text-[#dfc797] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e]"
              >
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </form>

            <Link
              href="/orders"
              aria-label="My Orders"
              title="My Orders"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#c9a96e]/35 px-3 py-2.5 text-xs text-white/80 transition hover:border-[#c9a96e] hover:text-[#dfc797]"
            >
              <Package size={18} />
              <span className="hidden sm:inline">My Orders</span>
            </Link>
            {!authChecked ? (
              <span className="inline-flex size-10 items-center justify-center text-[#c9a96e]" aria-label="Checking account"><UserRound size={18} /></span>
            ) : user ? (
              <div className="relative">
                <button type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#c9a96e]/40 px-3 py-2.5 text-xs text-[#dfc797] transition hover:bg-[#c9a96e]/10">
                  <UserRound size={18} /><span className="hidden max-w-28 truncate sm:inline">{(user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "My account"}</span>
                </button>
                {accountMenuOpen && <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#c9a96e]/25 bg-[#11110f] p-2 shadow-xl">
                  <Link href="/orders" onClick={() => setAccountMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-[#c9a96e]/10 hover:text-[#dfc797]">My orders</Link>
                  <Link href="/wishlist" onClick={() => setAccountMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-[#c9a96e]/10 hover:text-[#dfc797]">Wishlist</Link>
                  <button type="button" onClick={() => void handleHomeSignOut()} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-200 hover:bg-red-400/10">Sign out</button>
                </div>}
              </div>
            ) : (
              <Link href="/login" aria-label="Login or sign up" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-3 py-2.5 text-xs text-white/80 transition hover:border-[#c9a96e] hover:text-[#dfc797]">
                <UserRound size={18} /><span className="hidden sm:inline">Login / Sign Up</span>
              </Link>
            )}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative rounded-full border border-white/15 p-2.5 transition hover:border-[#c9a96e]"
            >
              <Heart size={18} />
              {wishlist.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a96e] px-1 text-[9px] text-black">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              aria-label="Shopping bag"
              className="rounded-full bg-[#c9a96e] p-2.5 text-black transition hover:bg-[#dfc797]"
            >
              <ShoppingBag size={18} />
            </Link>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-white/10 bg-[#11110f] px-5 py-5 lg:hidden">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                const query = search.trim()
                if (query) router.push(`/products?q=${encodeURIComponent(query)}`)
                else router.push("/products")
                setMobileMenuOpen(false)
              }}
              className="mb-4 flex items-center gap-2 rounded-xl border border-white/15 px-3 py-3 focus-within:border-[#c9a96e]"
            >
              <Search size={17} className="shrink-0 text-white/50" aria-hidden="true" />
              <input
                aria-label="Search all products"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the collection..."
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                aria-label="Search catalogue"
                className="shrink-0 rounded-full p-1 text-white/70 transition hover:text-[#dfc797] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a96e]"
              >
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
            <div className="flex flex-col">
              {[
                ...(user ? [["My Account", "/orders"]] : [["Login / Sign Up", "/login"]]),
                ["My Orders", "/orders"],
                ["Home", "/"],
                ["Shop all", "/products"],
                ["Watches", "/products?category=watches"],
                ["Audio", "/products?category=headphones"],
                ["New arrivals", "/products?sort=newest"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-white/10 py-3.5 text-sm text-white/75 hover:text-[#d8bc88]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_45%,rgba(173,133,66,0.13),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-[1440px] items-center gap-8 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:px-12 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c9a96e]/35 bg-[#c9a96e]/5 px-3.5 py-2 text-[9px] font-medium uppercase tracking-[0.22em] text-[#d9bd8c] sm:text-[10px]">
              <Sparkles size={13} />
              A more considered collection
            </div>

            <h1 className="text-[clamp(3.2rem,8vw,6.8rem)] font-light leading-[0.99] tracking-[-0.065em]">
              Less, but
              <br />
              <span className="font-medium text-[#d6b77e]">exceptional.</span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/55 sm:mt-8 sm:text-base sm:leading-8">
              Discover thoughtfully selected watches, audio essentials and
              everyday accessories that make every detail matter.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#c9a96e] px-7 text-xs font-semibold uppercase tracking-[0.13em] text-[#17130c] transition hover:bg-[#dfc797]"
              >
                Explore collection <ArrowUpRight size={16} />
              </Link>
              <Link
                href="#featured-products"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/20 px-7 text-xs font-medium uppercase tracking-[0.13em] transition hover:border-[#c9a96e] hover:text-[#d9bd8c]"
              >
                Discover the edit <ArrowDownRight size={16} />
              </Link>
            </div>

            <div className="mt-10 grid max-w-sm grid-cols-3 border-t border-white/10 pt-6 sm:mt-14">
              <div>
                <p className="text-lg font-medium sm:text-xl">01</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/40 sm:text-[10px]">
                  Thoughtful
                </p>
              </div>
              <div className="border-l border-white/10 pl-4 sm:pl-6">
                <p className="text-lg font-medium sm:text-xl">02</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/40 sm:text-[10px]">
                  Timeless
                </p>
              </div>
              <div className="border-l border-white/10 pl-4 sm:pl-6">
                <p className="text-lg font-medium sm:text-xl">03</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/40 sm:text-[10px]">
                  Personal
                </p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-3 rounded-[45%] bg-[#c9a96e]/5 blur-3xl" />
            <div className="relative aspect-[4/4.5] overflow-hidden rounded-[48%_48%_8px_8px] border border-white/10 bg-[#d7cbb6]">
              <Image
                src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=90"
                alt="Elegant wristwatch from the Timora-inspired collection"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="object-cover object-center transition duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/5" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 sm:bottom-8 sm:left-8 sm:right-8">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.24em] text-[#e4c995]">
                    The signature edit
                  </p>
                  <p className="mt-2 text-xl font-light tracking-wide sm:text-2xl">
                    Everyday icons
                  </p>
                </div>
                <Link
                  href="/products"
                  aria-label="Explore the signature collection"
                  className="rounded-full border border-white/40 bg-black/20 p-3 backdrop-blur transition hover:bg-[#c9a96e] hover:text-black"
                >
                  <ArrowUpRight size={19} />
                </Link>
              </div>
            </div>
            <div className="absolute -left-2 top-8 hidden rounded-2xl border border-white/15 bg-[#151512]/90 px-4 py-3 shadow-xl backdrop-blur sm:block lg:-left-7">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#c9a96e]" />
                <span className="text-[10px] uppercase tracking-[0.13em] text-white/80">
                  Curated, not crowded
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="border-y border-white/10 bg-[#10100e]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 sm:grid-cols-4">
          {categories.map(({ name, detail, icon: Icon, href }, index) => (
            <Link
              href={href}
              key={name}
              className={`group flex min-h-28 items-center gap-3 px-4 py-5 transition hover:bg-white/[0.035] sm:min-h-32 sm:gap-4 sm:px-6 lg:px-9 ${
                index % 2 === 0 ? "border-r border-white/10" : ""
              } ${index < 2 ? "border-b border-white/10 sm:border-b-0" : ""} ${
                index === 1 ? "sm:border-r" : ""
              } ${index === 2 ? "sm:border-r" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a96e]/25 text-[#d8bc88] transition group-hover:bg-[#c9a96e] group-hover:text-black sm:h-12 sm:w-12">
                <Icon size={20} strokeWidth={1.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium sm:text-sm">{name}</p>
                <p className="mt-1 text-[10px] text-white/40 sm:text-xs">{detail}</p>
              </div>
              <ChevronRight
                size={15}
                className="hidden text-white/30 transition group-hover:translate-x-1 group-hover:text-[#c9a96e] sm:block"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section id="featured-products" className="scroll-mt-6 mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d8bc88]">
              Carefully considered
            </p>
            <h2 className="mt-3 text-3xl font-light tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              The <span className="font-medium">edit.</span>
            </h2>
            <p className="mt-3 max-w-md text-xs leading-6 text-white/45 sm:text-sm">
              A selection of standout pieces chosen for their style, simplicity
              and everyday appeal.
            </p>
            {catalogueFallback && <p role="status" className="mt-3 max-w-xl rounded-lg border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2 text-xs leading-5 text-amber-100/70">No live products are available right now. Please check back soon.</p>}
          </div>
          <Link
            href="/products"
            className="inline-flex w-fit items-center gap-3 border-b border-[#c9a96e]/50 pb-2 text-xs text-[#dfc797] transition hover:border-[#dfc797]"
          >
            View the collection <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
          {["All", "Watches", "Headphones", "Accessories"].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] uppercase tracking-[0.1em] transition sm:px-5 ${
                activeCategory === category
                  ? "border-[#c9a96e] bg-[#c9a96e] text-[#17130c]"
                  : "border-white/15 text-white/55 hover:border-white/40 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {filteredProducts.map((product) => (
            <article key={product.id} className="group min-w-0">
              <div className={`relative aspect-[4/4.8] overflow-hidden rounded-xl ${product.tone}`}>
                <Link href={`/product/${product.slug}`} className="block h-full w-full">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                </Link>

                <span className={`absolute left-2 top-2 rounded-full px-2 py-1.5 text-[8px] font-semibold tracking-[0.09em] sm:left-3 sm:top-3 sm:px-2.5 sm:text-[9px] ${product.stock <= 0 ? "bg-[#242018]/95 text-white" : "bg-[#f4eee3]/95 text-[#242018]"}`}>
                  {product.stock <= 0 ? "SOLD OUT" : product.badge}
                </span>
                {product.tags?.slice(0, 2).map((tag, index) => (
                  <span key={tag} className={`absolute left-2 rounded-full border border-[#c9a96e]/45 bg-[#0b0b0a]/90 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-[#e5cb91] sm:left-3 sm:text-[9px] ${index === 0 ? "top-11 sm:top-12" : "top-[4.6rem] sm:top-[4.9rem]"}`}>
                    {tag}
                  </span>
                ))}

                <button
                  type="button"
                  aria-label={
                    wishlist.includes(product.id)
                      ? `Remove ${product.name} from wishlist`
                      : `Add ${product.name} to wishlist`
                  }
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#191713] shadow-sm transition hover:bg-white sm:right-3 sm:top-3"
                >
                  <Heart
                    size={17}
                    fill={wishlist.includes(product.id) ? "#b45353" : "none"}
                    className={wishlist.includes(product.id) ? "text-[#b45353]" : ""}
                  />
                </button>

                <Link
                  href={`/product/${product.slug}`}
                  className="absolute bottom-3 left-3 right-3 flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#f6f1e8]/95 px-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#18150f] opacity-100 transition hover:bg-white sm:bottom-4 sm:left-4 sm:right-4 sm:text-[10px] lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
                >
                  Discover item <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-[0.16em] text-white/40 sm:text-[10px]">
                  {product.category}
                </p>
                <Link href={`/product/${product.slug}`}>
                  <h3 className="mt-1.5 text-xs font-medium leading-5 transition hover:text-[#dfc797] sm:text-sm">
                    {product.name}
                  </h3>
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold sm:text-sm">
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice && (
                    <span className="text-[10px] text-white/35 line-through sm:text-xs">
                      {formatPrice(product.oldPrice)}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-[10px] sm:text-xs ${product.stock <= 0 ? "text-red-300/80" : product.stock <= 5 ? "text-amber-200/80" : "text-white/35"}`}>
                  {product.stock <= 0 ? "Currently unavailable" : product.stock <= 5 ? `Only ${product.stock} left in stock` : "In stock"}
                </p>
              </div>
            </article>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-white/10 py-16 text-center">
            <Search className="mx-auto text-white/30" size={28} />
            <p className="mt-4 text-sm text-white/70">No matching products found.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setActiveCategory("All")
              }}
              className="mt-4 text-xs text-[#dfc797] underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Brand statement */}
      <section className="border-y border-white/10 bg-[#11110f]">
        <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-24">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d8bc88]">
              The Timora philosophy
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-light leading-tight tracking-[-0.045em] sm:text-4xl lg:text-5xl">
              Good design is felt in the{" "}
              <span className="text-[#d8bc88]">details.</span>
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-sm leading-7 text-white/55 sm:text-base sm:leading-8">
              We believe everyday objects should do more than serve a purpose.
              They should feel considered, fit your life and stay relevant
              beyond a passing trend.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-3 text-xs font-medium text-[#dfc797] transition hover:gap-4"
            >
              Find your next favourite <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Service highlights */}
      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-px bg-white/10 px-5 py-10 sm:grid-cols-3 sm:px-8 lg:px-12">
        {[
          {
            icon: ShieldCheck,
            title: "Shop with confidence",
            description: "Clear product details to help you choose.",
          },
          {
            icon: Truck,
            title: "Delivery information",
            description: "Review delivery details at checkout.",
          },
          {
            icon: Check,
            title: "Here to help",
            description: "Contact our team whenever you need support.",
          },
        ].map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-start gap-4 bg-[#0b0b0a] px-4 py-5 sm:px-5 sm:py-7 lg:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c9a96e]/25 text-[#d8bc88]">
              <Icon size={19} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xs font-medium sm:text-sm">{title}</h3>
              <p className="mt-2 text-[11px] leading-5 text-white/45 sm:text-xs">
                {description}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-[#c9a96e]/20 bg-[#15140f] px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#c9a96e]/10 blur-3xl" />
          <div className="relative grid items-center gap-7 lg:grid-cols-[1fr_auto] lg:gap-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d8bc88]">
                A note from Timora
              </p>
              <h2 className="mt-3 text-3xl font-light tracking-[-0.04em] sm:text-4xl">
                Good things, occasionally.
              </h2>
              <p className="mt-3 max-w-lg text-xs leading-6 text-white/50 sm:text-sm">
                Stay connected for collection updates, new arrivals and
                carefully selected highlights.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#c9a96e] px-7 text-xs font-semibold uppercase tracking-[0.12em] text-[#17130c] transition hover:bg-[#dfc797]"
            >
              Explore Timora <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#080807]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 sm:py-14 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-12">
          <div>
            <Link href="/" className="text-2xl font-semibold tracking-[0.2em]">
              TIMORA<span className="text-[#c9a96e]">.</span>
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-6 text-white/45">
              A considered collection for the way you live, work and express
              yourself.
            </p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-white/30">
              Timeless style. Thoughtful choices.
            </p>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8bc88]">
              Discover
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/50">
              <Link href="/products" className="hover:text-white">Shop all</Link>
              <Link href="/products?category=watches" className="hover:text-white">Watches</Link>
              <Link href="/products?category=headphones" className="hover:text-white">Audio</Link>
              <Link href="/products?sort=newest" className="hover:text-white">New arrivals</Link>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8bc88]">
              Your account
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/50">
              <Link href="/login" className="hover:text-white">Sign in</Link>
              <Link href="/wishlist" className="hover:text-white">Wishlist</Link>
              <Link href="/cart" className="hover:text-white">Shopping bag</Link>
              <Link href="/orders" className="hover:text-white">Your orders</Link>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8bc88]">
              Need help?
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/50">
              <Link href="/contact" className="hover:text-white">Contact us</Link>
              <Link href="/shippings" className="hover:text-white">Shipping information</Link>
              <Link href="/returns" className="hover:text-white">Returns information</Link>
              <Link href="/privacy" className="hover:text-white">Privacy policy</Link>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 border-t border-white/10 px-5 py-5 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>© {new Date().getFullYear()} Timora. All rights reserved.</p>
          <p>Designed with intention.</p>
        </div>
      </footer>
    </main>
  )
}