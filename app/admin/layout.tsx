import type { ReactNode } from "react"

/**
 * Keep the admin route group layout intentionally side-effect free.
 * Browser history belongs to the browser; intercepting popstate can trap
 * users in the dashboard or create duplicate history entries.
 * Staff authorization is checked by each protected admin page and Supabase RLS.
 */
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children
}
