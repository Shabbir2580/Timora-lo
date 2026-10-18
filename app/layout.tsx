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

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://timora-by-sk.vercel.app").replace(/\/$/, "")

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Timora | Timeless Style. Modern Shopping.",
    template: "%s | Timora",
  },
  description:
    "Shop watches, audio essentials, fragrance, and lifestyle accessories at Timora. Discover curated products, clear pricing, and convenient online shopping in India.",
  applicationName: "Timora",
  generator: "Next.js",
  keywords: [
    "Timora",
    "Timora online shopping",
    "shop online India",
    "watches",
    "headphones",
    "audio accessories",
    "attar",
    "fragrance",
    "lifestyle accessories",
  ],
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: "UcrTky01Osjlu3LCmw3J5vP8ba5c7eRHA5eXxUpv8bA",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Timora",
    title: "Timora | Timeless Style. Modern Shopping.",
    description:
      "Discover watches, audio essentials, fragrance, and modern lifestyle accessories at Timora.",
    images: [{ url: "/timora-logo.svg?v=2", alt: "Timora" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Timora | Timeless Style. Modern Shopping.",
    description:
      "Discover watches, audio essentials, fragrance, and modern lifestyle accessories at Timora.",
    images: ["/timora-logo.svg?v=2"],
  },
  icons: {
    icon: [{ url: "/timora-logo.svg?v=2", type: "image/svg+xml" }],
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0b0a",
}

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Timora",
  url: siteUrl,
  description:
    "Discover watches, audio essentials, fragrance, and lifestyle accessories at Timora.",
  inLanguage: "en-IN",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredDataJson = JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c")

  return (
    <html lang="en-IN" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
