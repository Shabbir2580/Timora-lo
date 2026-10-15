import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://v0-timora.vercel.app").replace(/\/$/, "")

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/shippings`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/returns`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ]

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select("slug,updated_at")
      .eq("is_active", true)

    if (error) {
      console.error("Sitemap product lookup failed:", error.message)
      return staticRoutes
    }

    const productRoutes: MetadataRoute.Sitemap = (data ?? [])
      .filter((product) => typeof product.slug === "string" && product.slug.trim())
      .map((product) => ({
        url: `${siteUrl}/product/${encodeURIComponent(product.slug)}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))

    return [...staticRoutes, ...productRoutes]
  } catch (error) {
    console.error("Sitemap generation failed:", error)
    return staticRoutes
  }
}
