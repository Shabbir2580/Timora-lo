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
    const products: { slug: string; updated_at: string | null }[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("products")
        .select("slug,updated_at")
        .eq("is_active", true)
        .order("slug", { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        console.error("Sitemap product lookup failed:", error.message)
        return staticRoutes
      }

      const page = (data ?? []) as { slug: string; updated_at: string | null }[]
      products.push(...page)
      if (page.length < pageSize) break
    }

    const uniqueProducts = new Map<string, { slug: string; updated_at: string | null }>()
    for (const product of products) {
      if (typeof product.slug === "string" && product.slug.trim()) {
        uniqueProducts.set(product.slug, product)
      }
    }

    const productRoutes: MetadataRoute.Sitemap = [...uniqueProducts.values()]
      .map((product) => {
        const updatedAt = product.updated_at ? new Date(product.updated_at) : null
        return {
          url: `${siteUrl}/product/${encodeURIComponent(product.slug)}`,
          lastModified: updatedAt && Number.isFinite(updatedAt.getTime()) ? updatedAt : now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }
      })

    return [...staticRoutes, ...productRoutes]
  } catch (error) {
    console.error("Sitemap generation failed:", error)
    return staticRoutes
  }
}
