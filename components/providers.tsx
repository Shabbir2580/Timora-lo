"use client"

import type { ReactNode } from "react"
import { CartProvider } from "@/lib/cart-context"
import { GoldCursor } from "@/components/store/gold-cursor"

export function Providers({ children }: { children: ReactNode }) {
  return <CartProvider><GoldCursor />{children}</CartProvider>
}
