"use client"

import { useState } from "react"
import Link from "next/link"
import {
  User,
  Package,
  Heart,
  MapPin,
  Ticket,
  RotateCcw,
  Star,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react"

const links = [
  { href: "/account", label: "My Profile", icon: User },
  { href: "/orders", label: "My Orders", icon: Package },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/coupons", label: "Coupons", icon: Ticket },
  { href: "/account/returns", label: "Returns", icon: RotateCcw },
  { href: "/account/reviews", label: "Reviews", icon: Star },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
]

export function AccountMenu({ loggedIn = false }: { loggedIn?: boolean }) {
  const [open, setOpen] = useState(false)

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
      >
        <User className="size-5" aria-hidden />
        <span className="hidden lg:inline">Login</span>
      </Link>
    )
  }

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          AK
        </span>
        <span className="hidden text-left lg:block">
          <span className="block text-xs text-muted-foreground">Hello</span>
          <span className="block leading-none">Aarav</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 w-56 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <Link
            href="/login"
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-sale hover:bg-accent"
          >
            <LogOut className="size-4" aria-hidden />
            Logout
          </Link>
        </div>
      )}
    </div>
  )
}
