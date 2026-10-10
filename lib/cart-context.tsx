"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Product } from "./data"

export interface CartLine {
  product: Product
  variant: string
  quantity: number
}

interface CartState {
  lines: CartLine[]
  wishlist: string[]
  addToCart: (product: Product, variant?: string, quantity?: number) => void
  removeFromCart: (id: string, variant?: string) => void
  setQuantity: (id: string, quantity: number, variant?: string) => void
  toggleWishlist: (id: string) => void
  count: number
  subtotal: number
}

const CartContext = createContext<CartState | null>(null)

function maxQuantity(product: Product) {
  if (product.stock === "out_of_stock") return 0
  if (product.stock === "low_stock" && typeof product.stockCount === "number") {
    return Math.max(1, product.stockCount)
  }
  return 99
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("timora-shopping-state-v1")
      if (saved) {
        const parsed = JSON.parse(saved) as { lines?: CartLine[]; wishlist?: string[] }
        if (Array.isArray(parsed.lines)) {
          setLines(parsed.lines.filter((line) =>
            line && line.product && typeof line.product.id === "string" &&
            typeof line.variant === "string" && Number.isFinite(line.quantity) && line.quantity > 0,
          ))
        }
        if (Array.isArray(parsed.wishlist)) {
          setWishlist(parsed.wishlist.filter((id) => typeof id === "string"))
        }
      }
    } catch (error) {
      console.warn("Timora saved cart could not be restored.", error)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem("timora-shopping-state-v1", JSON.stringify({ lines, wishlist }))
    } catch (error) {
      console.warn("Timora cart could not be saved in this browser.", error)
    }
  }, [hydrated, lines, wishlist])

  function addToCart(product: Product, variant = product.colors[0] ?? "Default", quantity = 1) {
    const limit = maxQuantity(product)
    if (limit === 0) return
    const safeQuantity = Math.min(limit, Math.max(1, Math.floor(quantity)))
    setLines((prev) => {
      const existing = prev.find((line) => line.product.id === product.id && line.variant === variant)
      if (existing) {
        return prev.map((line) => line === existing
          ? { ...line, product, quantity: Math.min(limit, line.quantity + safeQuantity) }
          : line)
      }
      return [...prev, { product, variant, quantity: safeQuantity }]
    })
  }

  function removeFromCart(id: string, variant?: string) {
    setLines((prev) => prev.filter((line) =>
      line.product.id !== id || (variant !== undefined && line.variant !== variant),
    ))
  }

  function setQuantity(id: string, quantity: number, variant?: string) {
    setLines((prev) => prev.map((line) => {
      const matches = line.product.id === id && (variant === undefined || line.variant === variant)
      if (!matches) return line
      const limit = maxQuantity(line.product)
      return { ...line, quantity: Math.min(limit || 1, Math.max(1, Math.floor(quantity))) }
    }).filter((line) => maxQuantity(line.product) > 0))
  }

  function toggleWishlist(id: string) {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const count = useMemo(() => lines.reduce((total, line) => total + line.quantity, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.product.price * line.quantity, 0),
    [lines],
  )

  const value: CartState = {
    lines,
    wishlist,
    addToCart,
    removeFromCart,
    setQuantity,
    toggleWishlist,
    count,
    subtotal,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
