
"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
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

interface StoredCart {
  lines: CartLine[]
  wishlist: string[]
}

const STORAGE_KEY = "timora-cart-v1"

const CartContext = createContext<CartState | null>(null)

function readStoredCart(): StoredCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return { lines: [], wishlist: [] }
    }

    const parsed: unknown = JSON.parse(raw)

    if (!parsed || typeof parsed !== "object") {
      return { lines: [], wishlist: [] }
    }

    const stored = parsed as Partial<StoredCart>

    const lines = Array.isArray(stored.lines)
      ? stored.lines.filter(
          (line): line is CartLine =>
            !!line &&
            typeof line === "object" &&
            !!line.product &&
            typeof line.product.id === "string" &&
            typeof line.variant === "string" &&
            Number.isInteger(line.quantity) &&
            line.quantity > 0,
        )
      : []

    const wishlist = Array.isArray(stored.wishlist)
      ? stored.wishlist.filter(
          (id): id is string => typeof id === "string",
        )
      : []

    return { lines, wishlist: [...new Set(wishlist)] }
  } catch {
    return { lines: [], wishlist: [] }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Restore saved data after the component mounts in the browser.
  useEffect(() => {
    const stored = readStoredCart()
    setLines(stored.lines)
    setWishlist(stored.wishlist)
    setHydrated(true)
  }, [])

  // Never overwrite saved data until the initial restore has completed.
  useEffect(() => {
    if (!hydrated) return

    try {
      const stored: StoredCart = { lines, wishlist }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // The cart remains usable for this session if storage is unavailable.
    }
  }, [lines, wishlist, hydrated])

  function addToCart(
    product: Product,
    variant = product.colors[0] ?? "Default",
    quantity = 1,
  ) {
    if (!Number.isInteger(quantity) || quantity < 1) return

    setLines((previous) => {
      const existing = previous.find(
        (line) =>
          line.product.id === product.id && line.variant === variant,
      )

      if (existing) {
        return previous.map((line) =>
          line.product.id === product.id && line.variant === variant
            ? { ...line, quantity: line.quantity + quantity }
            : line,
        )
      }

      return [...previous, { product, variant, quantity }]
    })
  }

  function removeFromCart(id: string) {
    setLines((previous) =>
      previous.filter((line) => line.product.id !== id),
    )
  }

  function setQuantity(id: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) return

    setLines((previous) =>
      previous.map((line) =>
        line.product.id === id ? { ...line, quantity } : line,
      ),
    )
  }

  function toggleWishlist(id: string) {
    setWishlist((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    )
  }

  const count = useMemo(
    () => lines.reduce((total, line) => total + line.quantity, 0),
    [lines],
  )

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (total, line) => total + line.product.price * line.quantity,
        0,
      ),
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

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }

  return context
}
