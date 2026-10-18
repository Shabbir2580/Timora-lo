import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Admin URLs must never appear in search results.
 * This is SEO hygiene only, not an access-control boundary: protected admin
 * pages and every underlying API/database operation must enforce authorization.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
}

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children
}
