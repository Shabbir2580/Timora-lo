import type { MetadataRoute } from "next"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://timora-by-sk.vercel.app").replace(/\/$/, "")

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

  // Sitemap generation is public and may run during the production build.
  // Do not use the cookie-bound server client here: cookies() makes this route
  // dynamic and causes Next.js static sitemap generation to fail.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Sitemap product lookup skipped: Supabase public environment variables are missing.")
    return staticRoutes
  }

  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
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
