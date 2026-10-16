"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * Keep browser Back navigation inside the staff workspace.
 * Sub-pages return to /admin; pressing Back on the dashboard itself
 * stays on the dashboard instead of exposing the public storefront.
 */
function StaffBackNavigationGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const dashboardPath = "/admin"
    const isStaffRoute = pathname === dashboardPath || pathname.startsWith("/admin/")

    if (!isStaffRoute) return

    // Add a guard entry for the current staff route. The popstate handler below
    // restores the dashboard if Back is pressed from any staff sub-page.
    window.history.pushState({ timoraStaffRoute: true }, "", pathname)

    function handlePopState() {
      if (pathname !== dashboardPath) {
        router.replace(dashboardPath)
        return
      }

      // Back was pressed on the dashboard itself. Restore the dashboard entry
      // so the browser cannot navigate into the public storefront.
      window.history.pushState({ timoraStaffRoute: true }, "", dashboardPath)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [pathname, router])

  return null
}

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <StaffBackNavigationGuard />
      {children}
    </>
  )
}
