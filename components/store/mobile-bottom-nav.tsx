"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutGrid, Search, Heart, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCart } from "@/lib/cart-context"

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/category/headphones", label: "Categories", icon: LayoutGrid },
  { href: "/products", label: "Search", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { count } = useCart()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {label === "Cart" && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid size-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
