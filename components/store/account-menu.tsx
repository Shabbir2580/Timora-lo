
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  LoaderCircle,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

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

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return

      if (!sessionError) {
        setUser(data.session?.user ?? null)
      }

      setSessionChecked(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setSessionChecked(true)
        setOpen(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    setSigningOut(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        setError("We couldn't sign you out. Please try again.")
        setSigningOut(false)
        return
      }

      setUser(null)
      setOpen(false)
      router.replace("/login")
      router.refresh()
    } catch {
      setError("Something went wrong while signing out. Please try again.")
      setSigningOut(false)
    }
  }

  if (!sessionChecked) {
    return (
      <span
        className="inline-flex size-10 items-center justify-center text-[#c9a96e]"
        aria-label="Checking account"
      >
        <LoaderCircle className="size-4 animate-spin" />
      </span>
    )
  }

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Login or sign up"
        title="Login / Sign Up"
        className={
          compact
            ? "grid size-10 place-items-center rounded-full border border-[#c9a96e]/40 text-[#f5f1e8] transition hover:bg-[#c9a96e]/10 hover:text-[#dfc797]"
            : "inline-flex min-h-10 items-center gap-2 rounded-full border border-[#c9a96e]/40 px-3 text-sm font-medium text-[#f5f1e8] transition hover:bg-[#c9a96e]/10 hover:text-[#dfc797]"
        }
      >
        <User className="size-[18px]" aria-hidden="true" />
        <span className={compact ? "hidden sm:inline text-xs" : ""}>Login / Sign Up</span>
      </Link>
    )
  }

  const email = user.email ?? ""
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""
  const name = fullName || email.split("@")[0] || "My Account"
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current)
          setError("")
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent px-2 py-1.5 text-sm transition hover:border-[#c9a96e]/30 hover:bg-[#c9a96e]/10"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#c9a96e] text-xs font-bold text-[#17130c]">
          {initials}
        </span>

        <span className="hidden max-w-28 text-left xl:block">
          <span className="block text-[10px] text-white/50">Welcome back</span>
          <span className="block truncate text-xs text-[#f5f1e8]">
            {name}
          </span>
        </span>

        <ChevronDown
          className={`size-4 text-[#c9a96e] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div
            role="menu"
            aria-label="Account menu"
            className="absolute right-0 top-full z-50 mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-xl border border-[#c9a96e]/25 bg-[#10100e] py-2 text-[#f5f1e8] shadow-2xl shadow-black/40"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="mt-1 truncate text-xs text-white/50">{email}</p>
            </div>

            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center gap-3 px-4 py-2 text-sm text-white/75 transition hover:bg-[#c9a96e]/10 hover:text-[#dfc797]"
              >
                <Icon className="size-4 shrink-0 text-[#c9a96e]" aria-hidden="true" />
                {label}
              </Link>
            ))}

            {error && (
              <p role="alert" className="px-4 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="my-1 border-t border-white/10" />

            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={handleLogout}
              className="flex min-h-10 w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-300 transition hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-60"
            >
              {signingOut ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              {signingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
