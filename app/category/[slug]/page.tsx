import { redirect, notFound } from "next/navigation"
import { categories } from "@/lib/data"

export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = categories.find((item) => item.slug === slug.toLowerCase())
  if (!category) notFound()
  const selected = category!
  redirect(`/products?category=${encodeURIComponent(selected.slug)}`)
}
