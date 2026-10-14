
"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Heart,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { SearchBar } from "./search-bar"
import { AccountMenu } from "./account-menu"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop All" },
  { href: "/category/headphones", label: "Audio" },
  { href: "/products?deals=1", label: "Deals" },
]

export function Navbar() {
  const { count, wishlist } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#c9a96e]/20 bg-[#0b0b0a]/95 text-[#f5f1e8] shadow-lg shadow-black/10 backdrop-blur-xl">
      {/* Announcement strip */}
      <div className="border-b border-[#c9a96e]/15 bg-[#11110f] px-3 py-2 text-center text-[9px] font-medium uppercase tracking-[0.17em] text-[#d8bc88] sm:text-[10px]">
        Discover your next favourite · Welcome to Timora
      </div>

      {/* Desktop navigation */}
      <div className="mx-auto hidden max-w-[1440px] items-center gap-5 px-5 py-4 lg:flex xl:gap-8 xl:px-10">
        <Link
          href="/"
          aria-label="Timora home"
          className="group flex shrink-0 flex-col"
        >
          <span className="text-2xl font-semibold tracking-[0.19em]">
            TIMORA<span className="text-[#c9a96e]">.</span>
          </span>
          <span className="mt-0.5 text-[8px] uppercase tracking-[0.23em] text-white/40">
            Curated for your lifestyle
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex shrink-0 items-center gap-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2.5 text-xs font-medium text-white/65 transition hover:bg-[#c9a96e]/10 hover:text-[#dfc797] xl:px-4"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <SearchBar className="w-full" />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/wishlist"
            aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} items` : ""}`}
            className="relative inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent px-3 text-sm text-white/75 transition hover:border-[#c9a96e]/30 hover:bg-[#c9a96e]/10 hover:text-[#dfc797]"
          >
            <span className="relative">
              <Heart className="size-[18px]" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-[#c9a96e] text-[9px] font-bold text-[#17130c]">
                  {wishlist.length > 9 ? "9+" : wishlist.length}
                </span>
              )}
            </span>
            <span className="hidden xl:inline">Wishlist</span>
          </Link>

          <Link
            href="/cart"
            aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
            className="relative inline-flex min-h-10 items-center gap-2 rounded-full bg-[#c9a96e] px-3 text-sm font-medium text-[#17130c] transition hover:bg-[#dfc797]"
          >
            <span className="relative">
              <ShoppingCart className="size-[18px]" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full border border-[#0b0b0a] bg-[#f5f1e8] text-[9px] font-bold text-[#17130c]">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
            <span className="hidden xl:inline">Cart</span>
          </Link>

          <div className="ml-1">
            <AccountMenu />
          </div>
        </div>
      </div>

      {/* Mobile and tablet navigation */}
      <div className="lg:hidden">
        <div className="flex min-h-[68px] items-center justify-between gap-2 px-3 sm:px-5">
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/80 transition hover:border-[#c9a96e]/50 hover:text-[#dfc797]"
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>

          <Link
            href="/"
            aria-label="Timora home"
            className="flex min-w-0 flex-col items-center"
          >
            <span className="text-xl font-semibold tracking-[0.16em] sm:text-2xl">
              TIMORA<span className="text-[#c9a96e]">.</span>
            </span>
            <span className="text-[7px] uppercase tracking-[0.2em] text-white/40">
              Curated for your lifestyle
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} items` : ""}`}
              className="relative grid size-10 place-items-center rounded-full text-white/80 transition hover:bg-[#c9a96e]/10 hover:text-[#dfc797]"
            >
              <Heart className="size-[19px]" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-[#c9a96e] text-[9px] font-bold text-[#17130c]">
                  {wishlist.length > 9 ? "9+" : wishlist.length}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
              className="relative grid size-10 place-items-center rounded-full bg-[#c9a96e] text-[#17130c] transition hover:bg-[#dfc797]"
            >
              <ShoppingCart className="size-[19px]" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full border border-[#0b0b0a] bg-[#f5f1e8] text-[9px] font-bold text-[#17130c]">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-5">
          <SearchBar />
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-[#c9a96e]/20 bg-[#10100e] px-4 py-3 sm:px-5"
          >
            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-12 items-center justify-between border-b border-white/[0.07] px-2 text-sm text-white/75 transition hover:text-[#dfc797]"
                >
                  {link.label}
                  <ChevronDown className="size-4 -rotate-90 text-[#c9a96e]/70" />
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-12 items-center justify-between px-2 text-sm text-white/75 transition hover:text-[#dfc797]"
              >
                My Account
                <ChevronDown className="size-4 -rotate-90 text-[#c9a96e]/70" />
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
