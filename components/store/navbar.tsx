"use client"

import Link from "next/link"
import { Heart, ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { SearchBar } from "./search-bar"
import { AccountMenu } from "./account-menu"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/category/headphones", label: "Categories" },
  { href: "/products?deals=1", label: "Deals" },
]

export function Navbar() {
  const { count, wishlist } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      {/* Desktop */}
      <div className="mx-auto hidden max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:flex lg:px-8">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-foreground">
          TIMORA
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <SearchBar className="flex-1" />
        <div className="flex items-center gap-1">
          <Link
            href="/wishlist"
            className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <span className="relative">
              <Heart className="size-5" aria-hidden />
              {wishlist.length > 0 && <Dot />}
            </span>
            <span className="hidden xl:inline">Wishlist</span>
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <span className="relative">
              <ShoppingCart className="size-5" aria-hidden />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 grid size-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </span>
            <span className="hidden xl:inline">Cart</span>
          </Link>
          <AccountMenu loggedIn />
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-foreground">
            TIMORA
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/wishlist" aria-label="Wishlist" className="relative grid size-10 place-items-center rounded-lg hover:bg-accent">
              <Heart className="size-5" aria-hidden />
              {wishlist.length > 0 && <Dot />}
            </Link>
            <Link href="/cart" aria-label="Cart" className="relative grid size-10 place-items-center rounded-lg hover:bg-accent">
              <ShoppingCart className="size-5" aria-hidden />
              {count > 0 && (
                <span className="absolute right-1 top-1 grid size-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}

function Dot() {
  return <span className="absolute -right-1 -top-1 size-2 rounded-full bg-sale" />
}
