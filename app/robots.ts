import type { MetadataRoute } from "next"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://v0-timora.vercel.app").replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/product/", "/category/", "/contact", "/shippings", "/shipping", "/returns", "/privacy", "/terms"],
        disallow: ["/admin", "/api/", "/checkout", "/orders", "/login", "/register", "/forgot-password", "/reset-password", "/auth/"],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
    host: siteUrl,
  }
}
