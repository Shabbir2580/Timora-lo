
"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import {
  Heart,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  Package,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { SearchBar } from "./search-bar"
import { AccountMenu } from "./account-menu"

const announcementMessages = [
  "A little luxury, thoughtfully chosen for every day.",
  "Find your signature piece with Timora.",
  "Explore watches, fragrance, audio and more.",
  "Your next favourite might be just one click away.",
  "Timeless details. Modern essentials. The Timora edit.",
  "Discover something that feels unmistakably you.",
]

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop All" },
  { href: "/category/headphones", label: "Audio" },
  { href: "/products?deals=1", label: "Deals" },
]

export function Navbar() {
  const { count, wishlist } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [announcementIndex, setAnnouncementIndex] = useState(0)

  useEffect(() => {
    setAnnouncementIndex(Math.floor(Math.random() * announcementMessages.length))
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-[#d4af37]/20 bg-[#0b0b0a]/95 text-[#f5f1e8] shadow-lg shadow-black/10 backdrop-blur-xl">
      {/* Announcement strip */}
      <div className="border-b border-[#d4af37]/20 bg-[#11110f] px-3 py-2 text-center text-[9px] font-medium uppercase tracking-[0.12em] text-[#f5d76e] sm:text-[10px] sm:tracking-[0.17em]">
        <span key={announcementIndex} className="inline-block animate-in fade-in duration-300">
          {announcementMessages[announcementIndex]}
        </span>
      </div>

      {/* Desktop navigation */}
      <div className="mx-auto hidden max-w-[1440px] items-center gap-5 px-5 py-4 lg:flex xl:gap-8 xl:px-10">
        <Link
          href="/"
          aria-label="Timora home"
          className="group flex shrink-0 items-center"
        >
          <Image src="/timora-wordmark.svg" alt="Timora" width={240} height={60} priority className="h-12 w-44 object-contain xl:h-14 xl:w-52" />
          <span className="sr-only">Timora — Curated for your lifestyle</span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex shrink-0 items-center gap-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2.5 text-xs font-medium text-white/65 transition hover:bg-[#d4af37]/10 hover:text-[#f5d76e] xl:px-4"
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
            href="/orders"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d4af37]/30 px-3 text-sm font-medium text-white/80 transition hover:bg-[#d4af37]/10 hover:text-[#f5d76e]"
          >
            <Package className="size-[18px]" aria-hidden="true" />
            <span>My Orders</span>
          </Link>
          <Link
            href="/wishlist"
            aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} items` : ""}`}
            className="relative inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent px-3 text-sm text-white/75 transition hover:border-[#d4af37]/30 hover:bg-[#d4af37]/10 hover:text-[#f5d76e]"
          >
            <span className="relative">
              <Heart className="size-[18px]" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-[#d4af37] text-[9px] font-bold text-[#17130c]">
                  {wishlist.length > 9 ? "9+" : wishlist.length}
                </span>
              )}
            </span>
            <span className="hidden xl:inline">Wishlist</span>
          </Link>

          <Link
            href="/cart"
            aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
            className="relative inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4af37] px-3 text-sm font-medium text-[#17130c] transition hover:bg-[#f5d76e]"
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
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/80 transition hover:border-[#d4af37]/50 hover:text-[#f5d76e]"
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
            className="flex min-w-0 items-center justify-center"
          >
            <Image src="/timora-wordmark.svg" alt="Timora" width={220} height={55} priority className="h-10 w-36 object-contain sm:h-12 sm:w-44" />
            <span className="sr-only">Timora — Curated for your lifestyle</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/orders"
              aria-label="My Orders"
              title="My Orders"
              className="grid size-10 place-items-center rounded-full border border-[#d4af37]/30 text-white/80 transition hover:bg-[#d4af37]/10 hover:text-[#f5d76e]"
            >
              <Package className="size-[19px]" aria-hidden="true" />
            </Link>
            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} items` : ""}`}
              className="relative grid size-10 place-items-center rounded-full text-white/80 transition hover:bg-[#d4af37]/10 hover:text-[#f5d76e]"
            >
              <Heart className="size-[19px]" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-[#d4af37] text-[9px] font-bold text-[#17130c]">
                  {wishlist.length > 9 ? "9+" : wishlist.length}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}
              className="relative grid size-10 place-items-center rounded-full bg-[#d4af37] text-[#17130c] transition hover:bg-[#f5d76e]"
            >
              <ShoppingCart className="size-[19px]" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full border border-[#0b0b0a] bg-[#f5f1e8] text-[9px] font-bold text-[#17130c]">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>

            <AccountMenu compact />
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-5">
          <SearchBar />
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-[#d4af37]/20 bg-[#10100e] px-4 py-3 sm:px-5"
          >
            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-12 items-center justify-between border-b border-white/[0.07] px-2 text-sm text-white/75 transition hover:text-[#f5d76e]"
                >
                  {link.label}
                  <ChevronDown className="size-4 -rotate-90 text-[#d4af37]/70" />
                </Link>
              ))}
              
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
