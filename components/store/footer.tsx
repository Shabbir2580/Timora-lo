
import Link from "next/link"
import { Instagram, Mail, Phone, ArrowUpRight } from "lucide-react"

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Shop all", href: "/products" },
      { label: "Headphones", href: "/category/headphones" },
      { label: "Watches", href: "/products?category=watches" },
      { label: "New arrivals", href: "/products?sort=newest" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "My orders", href: "/orders" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Shopping cart", href: "/cart" },
    ],
  },
  {
    title: "Information",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Shipping information", href: "/shipping" },
      { label: "Returns information", href: "/returns" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-8 border-t border-[#c9a96e]/20 bg-[#080807] text-[#f5f1e8]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <Link
              href="/"
              aria-label="Timora home"
              className="inline-flex flex-col"
            >
              <span className="text-2xl font-semibold tracking-[0.19em]">
                TIMORA<span className="text-[#c9a96e]">.</span>
              </span>
              <span className="mt-1 text-[8px] uppercase tracking-[0.25em] text-white/40">
                Curated for your lifestyle
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-white/50">
              Discover watches, audio essentials and everyday accessories
              selected with a focus on thoughtful design and timeless style.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.instagram.com/_timora_cart_/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Timora on Instagram"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs text-white/70 transition hover:border-[#c9a96e]/60 hover:text-[#dfc797]"
              >
                <Instagram className="size-4" aria-hidden="true" />
                Instagram
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-5 text-xs leading-6 text-white/40">
              Customer care
              <br />
              <a
                href="tel:+919909231028"
                className="mt-1 inline-flex items-center gap-2 text-[#d8bc88] hover:text-[#f0d9a9]"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                +91 99092 31028
              </a>
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8bc88]">
                {column.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-xs leading-6 text-white/50 transition hover:text-[#dfc797]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-[10px] leading-5 text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Timora. All rights reserved.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 transition hover:text-[#dfc797]">
            <Mail className="size-3.5" aria-hidden="true" />
            Contact support
          </Link>
        </div>
      </div>
    </footer>
  )
}
