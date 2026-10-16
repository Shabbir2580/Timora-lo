
import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://v0-timora.vercel.app").replace(/\/$/, "")

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Timora | Timeless Style. Modern Shopping.",
  description:
    "Discover watches, audio essentials, and lifestyle accessories at Timora. Explore our curated collection and find your next favourite.",
  applicationName: "Timora",
  generator: "Next.js",
  keywords: ["Timora", "luxury shopping India", "watches", "audio accessories", "lifestyle accessories", "online shopping"],
  openGraph: {
    type: "website",
    siteName: "Timora",
    title: "Timora | Timeless Style. Modern Shopping.",
    description: "Discover considered essentials, timeless accessories, and modern lifestyle pieces at Timora.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timora | Timeless Style. Modern Shopping.",
    description: "Discover considered essentials, timeless accessories, and modern lifestyle pieces at Timora.",
  },
  icons: {
    icon: [{ url: "/timora-logo.svg?v=2", type: "image/svg+xml" }],
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0b0a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
