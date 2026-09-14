import type { ReactNode } from "react"
import { AnnouncementBar } from "./announcement-bar"
import { Navbar } from "./navbar"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { Footer } from "./footer"

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
