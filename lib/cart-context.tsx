
"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { products, type Product } from "./data"

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

const STORAGE_KEY = "timora-shopping-state-v1"
const DEFAULT_MAX_QUANTITY = 99

function maxQuantity(product: Product): number {
  if (product.stock === "out_of_stock") {
    return 0
  }

  if (
    product.stock === "low_stock" &&
    typeof product.stockCount === "number"
  ) {
    return Math.max(0, Math.floor(product.stockCount))
  }

  return DEFAULT_MAX_QUANTITY
}

function isValidQuantity(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0
}

function getCurrentProduct(id: string): Product | undefined {
  return products.find((product) => product.id === id)
}

function normalizeQuantity(
  product: Product,
  quantity: number,
): number {
  const limit = maxQuantity(product)

  if (limit === 0 || !isValidQuantity(quantity)) {
    return 0
  }

  return Math.min(limit, Math.max(1, Math.floor(quantity)))
}

function normalizeVariant(
  product: Product,
  variant: string,
): string {
  if (product.colors.includes(variant)) {
    return variant
  }

  return product.colors[0] ?? "Default"
}

function restoreCartLine(value: unknown): CartLine | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const saved = value as Partial<CartLine>

  if (
    !saved.product ||
    typeof saved.product !== "object" ||
    typeof saved.product.id !== "string" ||
    typeof saved.variant !== "string" ||
    !isValidQuantity(saved.quantity as number)
  ) {
    return null
  }

  const product = getCurrentProduct(saved.product.id)

  if (!product) {
    return null
  }

  const quantity = normalizeQuantity(
    product,
    saved.quantity as number,
  )

  if (quantity === 0) {
    return null
  }

  const variant = normalizeVariant(product, saved.variant)

  return {
    product,
    variant,
    quantity,
  }
}

function restoreWishlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const validIds = new Set(products.map((product) => product.id))

  return Array.from(
    new Set(
      value.filter(
        (id): id is string =>
          typeof id === "string" && validIds.has(id),
      ),
    ),
  )
}

export function CartProvider({
  children,
}: {
  children: ReactNode
}) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)

      if (saved) {
        const parsed: unknown = JSON.parse(saved)

        if (parsed && typeof parsed === "object") {
          const state = parsed as {
            lines?: unknown
            wishlist?: unknown
          }

          if (Array.isArray(state.lines)) {
            const restoredLines = state.lines
              .map(restoreCartLine)
              .filter(
                (line): line is CartLine => line !== null,
              )

            const mergedLines = restoredLines.reduce<CartLine[]>(
              (result, line) => {
                const existing = result.find(
                  (item) =>
                    item.product.id === line.product.id &&
                    item.variant === line.variant,
                )

                if (existing) {
                  const quantity = normalizeQuantity(
                    line.product,
                    existing.quantity + line.quantity,
                  )

                  if (quantity > 0) {
                    existing.quantity = quantity
                  }
                } else {
                  result.push({ ...line })
                }

                return result
              },
              [],
            )

            setLines(mergedLines)
          }

          setWishlist(restoreWishlist(state.wishlist))
        }
      }
    } catch (error) {
      console.warn(
        "Timora saved cart could not be restored.",
        error,
      )
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lines, wishlist }),
      )
    } catch (error) {
      console.warn(
        "Timora cart could not be saved in this browser.",
        error,
      )
    }
  }, [hydrated, lines, wishlist])

  function addToCart(
    product: Product,
    variant = product.colors[0] ?? "Default",
    quantity = 1,
  ) {
    const currentProduct = getCurrentProduct(product.id)

    if (!currentProduct) {
      return
    }

    const safeVariant = normalizeVariant(
      currentProduct,
      variant,
    )

    const safeQuantity = normalizeQuantity(
      currentProduct,
      quantity,
    )

    if (safeQuantity === 0) {
      return
    }

    setLines((previous) => {
      const existing = previous.find(
        (line) =>
          line.product.id === currentProduct.id &&
          line.variant === safeVariant,
      )

      if (existing) {
        const updatedQuantity = normalizeQuantity(
          currentProduct,
          existing.quantity + safeQuantity,
        )

        if (updatedQuantity === 0) {
          return previous.filter(
            (line) =>
              line.product.id !== currentProduct.id ||
              line.variant !== safeVariant,
          )
        }

        return previous.map((line) =>
          line.product.id === currentProduct.id &&
          line.variant === safeVariant
            ? {
                ...line,
                product: currentProduct,
                quantity: updatedQuantity,
              }
            : line,
        )
      }

      return [
        ...previous,
        {
          product: currentProduct,
          variant: safeVariant,
          quantity: safeQuantity,
        },
      ]
    })
  }

  function removeFromCart(
    id: string,
    variant?: string,
  ) {
    setLines((previous) =>
      previous.filter(
        (line) =>
          line.product.id !== id ||
          (variant !== undefined &&
            line.variant !== variant),
      ),
    )
  }

  function setQuantity(
    id: string,
    quantity: number,
    variant?: string,
  ) {
    const currentProduct = getCurrentProduct(id)

    if (!currentProduct) {
      removeFromCart(id, variant)
      return
    }

    if (!isValidQuantity(quantity)) {
      return
    }

    setLines((previous) =>
      previous
        .map((line) => {
          const matches =
            line.product.id === id &&
            (variant === undefined ||
              line.variant === variant)

          if (!matches) {
            return line
          }

          const updatedQuantity = normalizeQuantity(
            currentProduct,
            quantity,
          )

          return {
            ...line,
            product: currentProduct,
            quantity: updatedQuantity,
          }
        })
        .filter((line) => line.quantity > 0),
    )
  }

  function toggleWishlist(id: string) {
    if (!getCurrentProduct(id)) {
      return
    }

    setWishlist((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    )
  }

  const count = useMemo(
    () =>
      lines.reduce(
        (total, line) => total + line.quantity,
        0,
      ),
    [lines],
  )

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + line.product.price * line.quantity,
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
    throw new Error(
      "useCart must be used within CartProvider",
    )
  }

  return context
}
