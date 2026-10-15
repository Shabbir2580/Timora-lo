import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react"
import { products as sampleProducts, type Product, type ProductBadge, type StockState } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { ProductActions } from "./product-actions"
import { ProductReviews } from "@/components/store/product-reviews"

export const dynamic = "force-dynamic"

type DatabaseProduct = {
  id: string; name: string; slug: string; description: string | null; price: number | string
  compare_at_price: number | string | null; category: string; image_url: string | null
  images: string[] | null; available_stock: number; is_active: boolean
}

function toProduct(row: DatabaseProduct): Product {
  const price = Number(row.price)
  const mrp = row.compare_at_price == null ? price : Number(row.compare_at_price)
  const stockCount = Number(row.available_stock)
  const category = row.category?.trim() || "Accessories"
  const image = row.image_url || row.images?.[0] || "/timora/watch.png"
  const stock: StockState = stockCount <= 0 ? "out_of_stock" : stockCount <= 5 ? "low_stock" : "in_stock"
  const badges: ProductBadge[] = mrp > price ? ["SALE"] : []
  return {
    id: row.id, slug: row.slug, brand: "Timora", name: row.name, category,
    categorySlug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-"), price, mrp,
    rating: 0, reviewCount: 0, image, images: row.images?.length ? row.images : [image], badges,
    verified: false, stock, stockCount, deliveryBy: "Delivery estimate shown at checkout",
    freeDelivery: false, returnDays: 7, colors: [], highlights: [], specs: [], box: [],
    warranty: "See product packaging or contact customer care", description: row.description || "A thoughtfully selected product from Timora.", reviews: [],
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let product: Product | undefined
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("available_products")
      .select("id,name,slug,description,price,compare_at_price,category,image_url,images,available_stock,is_active")
      .eq("slug", slug).eq("is_active", true).maybeSingle()
    if (!error && data) product = toProduct(data as DatabaseProduct)
  } catch (error) {
    console.error("Product detail lookup failed:", error)
  }
  product ??= sampleProducts.find((item) => item.slug === slug)
  if (!product) notFound()
  const resolvedProduct = product as Product

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f5f1e8]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 hover:text-[#dfc797]"><ArrowLeft size={16}/> Back to shopping</Link>
        <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f1eee7]">
            <div className="relative aspect-square w-full">
              <Image src={resolvedProduct.image} alt={resolvedProduct.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-contain p-8 sm:p-14" />
            </div>
            {resolvedProduct.images.length > 1 && <div className="grid grid-cols-4 gap-2 p-3 sm:p-4">{resolvedProduct.images.slice(0,4).map((image,index)=><div key={`${image}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-white"><Image src={image} alt={`${resolvedProduct.name} image ${index+1}`} fill sizes="120px" className="object-contain p-2"/></div>)}</div>}
          </div>
          <section className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[#c9a96e]">{resolvedProduct.category}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{resolvedProduct.name}</h1>
            <p className="mt-5 text-3xl font-semibold">{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(resolvedProduct.price)}</p>
            {resolvedProduct.mrp > resolvedProduct.price && <p className="mt-1 text-sm text-white/45 line-through">MRP {new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(resolvedProduct.mrp)}</p>}
            { !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resolvedProduct.id) && (
              <p role="status" className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm leading-6 text-amber-100">Preview listing only. This demo item is not part of the live catalogue and cannot be ordered.</p>
            )}
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/65">{resolvedProduct.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/65"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><Truck size={15}/> Delivery details at checkout</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><ShieldCheck size={15}/> Order details checked</span></div>
            <p className={`mt-5 text-sm font-medium ${resolvedProduct.stock === "out_of_stock" ? "text-red-300" : resolvedProduct.stock === "low_stock" ? "text-amber-200" : "text-emerald-300"}`}>{resolvedProduct.stock === "out_of_stock" ? "Currently out of stock" : resolvedProduct.stock === "low_stock" ? "Limited stock available" : "Available to order"}</p>
            <ProductActions product={resolvedProduct}/>
            <div className="mt-7 border-t border-white/10 pt-5"><h2 className="text-sm font-semibold">Product information</h2><p className="mt-2 text-sm leading-6 text-white/55">For questions about compatibility, warranty or delivery, contact Timora customer care before ordering.</p><a href="https://wa.me/919909231028" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[#c9a96e]/50 px-4 text-sm text-[#dfc797] hover:bg-[#c9a96e]/10">Ask customer care</a></div>
          </section>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <ProductReviews productId={resolvedProduct.id} productName={resolvedProduct.name} />
      </div>
    </main>
  )
}
