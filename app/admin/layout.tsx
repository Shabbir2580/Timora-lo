"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * When browser Back leaves a staff sub-page, return to the staff dashboard
 * instead of accidentally dropping staff into the public storefront.
 */
function StaffBackNavigationGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    function handlePopState() {
      if (pathname.startsWith("/admin/")) {
        router.replace("/admin")
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [router, pathname])

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
