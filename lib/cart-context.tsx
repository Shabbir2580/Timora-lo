"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
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
  removeFromCart: (id: string) => void
  setQuantity: (id: string, quantity: number) => void
  toggleWishlist: (id: string) => void
  count: number
  subtotal: number
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])

  function addToCart(product: Product, variant = product.colors[0] ?? "Default", quantity = 1) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id && l.variant === variant)
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + quantity } : l,
        )
      }
      return [...prev, { product, variant, quantity }]
    })
  }

  function removeFromCart(id: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== id))
  }

  function setQuantity(id: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, quantity) } : l)),
    )
  }

  function toggleWishlist(id: string) {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const count = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((n, l) => n + l.product.price * l.quantity, 0),
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
