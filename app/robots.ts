import type { MetadataRoute } from "next"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://timora-by-sk.vercel.app").replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Prevent crawling and indexing across the site while it is private.
        disallow: ["/"],
      },
    ],
    sitemap: undefined,
    host: siteUrl,
  }
}
