
"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Package,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  LogOut,
  Search,
  ExternalLink,
  UploadCloud,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { normalizeImageUrl } from "@/components/store/smart-image"

function normalizeVideoUrl(value: string) {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    if (url.hostname === "drive.google.com" || url.hostname.endsWith(".drive.google.com")) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/i)
      const id = match?.[1] || url.searchParams.get("id") || ""
      if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
    }
  } catch {
    // Keep non-URL values unchanged so existing validation can show the right error.
  }
  return trimmed
}

type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compare_at_price: number | null
  category: string
  image_url: string
  images: string[]
  videos: string[]
  tags: string[]
  stock: number
  is_active: boolean
  created_at: string
}

type ProductForm = {
  name: string
  slug: string
  description: string
  price: string
  compare_at_price: string
  category: string
  image_url: string
  additional_images: string
  videos: string
  tags: string
  stock: string
  is_active: boolean
}

const emptyForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compare_at_price: "",
  category: "Watches",
  image_url: "",
  additional_images: "",
  videos: "",
  tags: "",
  stock: "0",
  is_active: true,
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-[#151512] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#d4af37]"

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [role, setRole] = useState<"admin" | "employee" | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    setError("")

    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })

      if (queryError) throw queryError

      setProducts((data ?? []) as Product[])
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not load products: ${err.message}`
          : "Could not load products."
      )
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function checkAccess() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.replace("/login?next=%2Fadmin")
          return
        }

        const { data: staff, error: roleError } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()

        if (roleError) {
          if (active) {
            setError("Unable to verify admin permissions. Please try again.")
          }
          return
        }

        if (!staff || !["admin", "employee"].includes(staff.role)) {
          router.replace("/")
          return
        }

        if (active) {
          setRole(staff.role as "admin" | "employee")
          setAuthorized(true)
          await loadProducts()
        }
      } catch {
        if (active) {
          setError("Unable to verify your account. Please refresh the page.")
        }
      } finally {
        if (active) setCheckingAccess(false)
      }
    }

    void checkAccess()

    return () => {
      active = false
    }
  }, [router, loadProducts])

  function startNewProduct() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
    setError("")
    setNotice("")
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: String(product.price),
      compare_at_price:
        product.compare_at_price == null
          ? ""
          : String(product.compare_at_price),
      category: product.category,
      image_url: product.image_url ?? "",
      additional_images: (product.images ?? []).filter((image) => image !== product.image_url).slice(0, 5).join("\n"),
      videos: (product.videos ?? []).slice(0, 2).join("\n"),
      tags: (product.tags ?? []).join(", "),
      stock: String(product.stock),
      is_active: product.is_active,
    })
    setFormOpen(true)
    setError("")
    setNotice("")
  }

  function updateField<K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function uploadProductVideo(file: File) {
    setError("")
    setNotice("")

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim()
    if (!cloudName || !uploadPreset) {
      setError("Cloudinary upload is not configured yet. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in the app environment, then reload.")
      return
    }

    const currentVideos = form.videos.split("\n").map((value) => value.trim()).filter(Boolean)
    if (currentVideos.length >= 2) {
      setError("Each product can have up to 2 videos. Remove a video URL before uploading another.")
      return
    }

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"]
    if (!allowedTypes.includes(file.type)) {
      setError("Choose an MP4, WebM, or MOV video.")
      return
    }
    const maxBytes = 100 * 1024 * 1024
    if (file.size > maxBytes) {
      setError("The video must be 100 MB or smaller. Compress it before uploading.")
      return
    }

    setUploadingVideo(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("upload_preset", uploadPreset)
      body.append("folder", "timora/products")
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`,
        { method: "POST", body }
      )
      const result = await response.json() as {
        secure_url?: string
        error?: { message?: string }
      }
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Cloudinary could not upload this video.")
      }

      const latestVideos = form.videos.split("\n").map((value) => value.trim()).filter(Boolean)
      if (latestVideos.length >= 2) {
        throw new Error("The product already has 2 video URLs. The upload completed, but its URL was not added; copy this URL from Cloudinary: " + result.secure_url)
      }
      updateField("videos", [...latestVideos, result.secure_url].join("\n"))
      setNotice("Video uploaded to Cloudinary. Save the product to publish the video on its product page.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the product video.")
    } finally {
      setUploadingVideo(false)
    }
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")

    const price = Number(form.price)
    const compareAtPrice =
      form.compare_at_price.trim() === ""
        ? null
        : Number(form.compare_at_price)
    const stock = Number(form.stock)
    const tags = Array.from(new Set(form.tags.split(",").map((tag) => tag.trim()).filter(Boolean))).slice(0, 5)
    const slug = makeSlug(form.slug || form.name)

    if (!form.name.trim() || !slug) {
      setError("Enter a product name and a valid slug.")
      setSaving(false)
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid selling price greater than zero.")
      setSaving(false)
      return
    }

    if (
      compareAtPrice !== null &&
      (!Number.isFinite(compareAtPrice) || compareAtPrice < price)
    ) {
      setError("The original price must be equal to or greater than the selling price.")
      setSaving(false)
      return
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a whole number greater than or equal to zero.")
      setSaving(false)
      return
    }

    // Validate the URLs entered by the user BEFORE normalizing them.
    // Google Drive images are converted to an internal /api/drive-image route,
    // which is intentionally relative and must not be re-validated as an external URL.
    const rawMainImage = form.image_url.trim()
    const rawAdditionalImages = form.additional_images
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
    const rawVideos = form.videos
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)

    const isValidHttpUrl = (value: string) => {
      try {
        const parsed = new URL(value)
        return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname)
      } catch {
        return false
      }
    }
    // Existing products may already store a safe same-site path after Drive URL
    // normalization. Preserve those paths when editing; reject protocol-relative URLs.
    const isSafeLocalImagePath = (value: string) =>
      value.startsWith("/") && !value.startsWith("//") && !value.includes("\\\\") && !value.includes("..")
    const isValidImageValue = (value: string) => isValidHttpUrl(value) || isSafeLocalImagePath(value)

    if (rawMainImage && !isValidImageValue(rawMainImage)) {
      setError("Enter a valid image URL beginning with https:// or http://, or keep an existing site image path.")
      setSaving(false)
      return
    }
    const invalidAdditionalImage = rawAdditionalImages.find((url) => !isValidImageValue(url))
    if (invalidAdditionalImage) {
      setError(`Invalid additional image URL: ${invalidAdditionalImage}`)
      setSaving(false)
      return
    }
    const invalidVideo = rawVideos.find((url) => !isValidHttpUrl(url))
    if (invalidVideo) {
      setError(`Invalid video URL: ${invalidVideo}`)
      setSaving(false)
      return
    }

    const mainImage = rawMainImage ? normalizeImageUrl(rawMainImage) : ""
    const additionalImages = rawAdditionalImages.map(normalizeImageUrl)
    const videos = rawVideos.map(normalizeVideoUrl)
    const preservedImages = Array.from(new Set([mainImage, ...additionalImages].filter(Boolean)))
    if (preservedImages.length > 6) {
      setError("Add up to 6 product image URLs in total, including the main image.")
      setSaving(false)
      return
    }
    if (videos.length > 2) {
      setError("Add up to 2 product video URLs.")
      setSaving(false)
      return
    }

    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description.trim(),
      price,
      compare_at_price: compareAtPrice,
      category: form.category.trim() || "Accessories",
      image_url: preservedImages[0] ?? "",
      images: preservedImages,
      videos,
      tags,
      stock,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login?next=%2Fadmin")
        return
      }

      const { data: staff, error: roleError } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()

      if (roleError || !staff || !["admin", "employee"].includes(staff.role)) {
        setError("Staff permission could not be verified. No changes were saved.")
        return
      }

      const result = editingId
        ? await supabase
            .from("products")
            .update(payload)
            .eq("id", editingId)
            .select("id")
            .single()
        : await supabase
            .from("products")
            .insert(payload)
            .select("id")
            .single()

      if (result.error) throw result.error

      setNotice(editingId ? "Product updated successfully." : "Product added successfully.")
      setFormOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await loadProducts()
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not save product: ${err.message}`
          : "Could not save product. Please try again."
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleProduct(product: Product) {
    setError("")
    setNotice("")

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("products")
        .update({
          is_active: !product.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id)

      if (updateError) throw updateError

      setNotice(
        product.is_active
          ? "Product hidden from the public catalogue."
          : "Product activated."
      )
      await loadProducts()
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not change product status: ${err.message}`
          : "Could not change product status."
      )
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}"? This cannot be undone.`
    )

    if (!confirmed) return

    setError("")
    setNotice("")

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login?next=%2Fadmin")
        return
      }

      const { data: staff, error: roleError } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()

      if (roleError || !staff || !["admin", "employee"].includes(staff.role)) {
        setError("Only authorized Timora staff can permanently delete products.")
        return
      }

      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)

      if (deleteError) throw deleteError

      setNotice("Product deleted.")
      await loadProducts()
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not delete product: ${err.message}`
          : "Could not delete product."
      )
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const availableTags = Array.from(
    new Set(products.flatMap((product) => product.tags ?? []))
  ).sort((a, b) => a.localeCompare(b))

  const filteredProducts = products.filter((product) => {
    const term = search.toLowerCase().trim()
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      product.slug.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      (product.tags ?? []).some((tag) => tag.toLowerCase().includes(term))
    const matchesTag =
      tagFilter === "all" ||
      (product.tags ?? []).some((tag) => tag.toLowerCase() === tagFilter.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.is_active) ||
      (statusFilter === "hidden" && !product.is_active) ||
      (statusFilter === "low-stock" && product.stock > 0 && product.stock <= 5) ||
      (statusFilter === "out-of-stock" && product.stock <= 0)
    return matchesSearch && matchesTag && matchesStatus
  })

  if (checkingAccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]">
        <p className="text-sm">Verifying staff access...</p>
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0b0a] px-5 text-[#f8f8f8]">
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto mb-4 size-10 text-[#d4af37]" />
          <h1 className="text-xl font-semibold">Staff access required</h1>
          <p className="mt-2 text-sm text-white/60">
            Your account does not have permission to manage products.
          </p>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full border border-[#d4af37]/40 px-4 py-2 text-sm text-[#e4c878]"
          >
            Return to Timora
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]">
      <header className="sticky top-0 z-20 border-b border-[#d4af37]/20 bg-[#0b0b0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="Back to admin dashboard"
              className="grid size-10 place-items-center rounded-full border border-white/10 hover:border-[#d4af37]/50"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <p className="text-lg font-semibold tracking-[0.18em]">
                TIMORA<span className="text-[#d4af37]">.</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                Staff workspace
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/admin/orders" className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#e4c878]">Orders</Link>
            <Link href="/admin/reviews" className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#e4c878]">Reviews</Link>
            <Link href="/admin/coupons" className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#e4c878]">Coupons</Link>
            <Link href="/admin/employees" className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#e4c878]">Employees</Link>
            <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#e4c878]"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
              Store management
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Products
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
              Manage your catalogue, selling prices, stock, and product visibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/image-url-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-4 text-sm font-semibold text-[#f0d98c] shadow-[0_0_0_1px_rgba(212,175,55,0.08)] transition hover:bg-[#d4af37]/20"
            >
              <ExternalLink className="size-4" />
              Drive Image Converter
            </Link>
            <button
              type="button"
              onClick={startNewProduct}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] transition hover:bg-[#e6c85c]"
            >
              <Plus className="size-4" />
              Add product
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Package className="size-4 text-[#d4af37]" />
              Total products
            </div>
            <p className="mt-3 text-2xl font-semibold">{products.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#11110f] p-4">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Eye className="size-4 text-[#d4af37]" />
              Active products
            </div>
            <p className="mt-3 text-2xl font-semibold">
              {products.filter((product) => product.is_active).length}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/10 bg-[#11110f] p-4 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Package className="size-4 text-[#d4af37]" />
              Units in stock
            </div>
            <p className="mt-3 text-2xl font-semibold">
              {products.reduce((total, product) => total + product.stock, 0)}
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="mt-5 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#e6d39c]">
            {notice}
          </div>
        )}

        {formOpen && (
          <section className="mt-7 rounded-2xl border border-[#d4af37]/30 bg-[#11110f] p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium">
                  {editingId ? "Edit product" : "Add a product"}
                </h2>
                <p className="mt-1 text-xs text-white/45">
                  Fields marked * are required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  setEditingId(null)
                  setForm(emptyForm)
                }}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={saveProduct} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-white/65">
                Product name *
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value
                    setForm((current) => ({
                      ...current,
                      name,
                      slug: editingId ? current.slug : makeSlug(name),
                    }))
                  }}
                  placeholder="e.g. Timora Classic Watch"
                  required
                  maxLength={160}
                />
              </label>

              <label className="text-xs text-white/65">
                Product URL slug *
                <input
                  className={inputClass}
                  value={form.slug}
                  onChange={(event) => updateField("slug", makeSlug(event.target.value))}
                  placeholder="timora-classic-watch"
                  required
                  maxLength={180}
                />
              </label>

              <label className="text-xs text-white/65">
                Selling price (₹) *
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="12999"
                  required
                />
              </label>

              <label className="text-xs text-white/65">
                Original price / MRP (₹)
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compare_at_price}
                  onChange={(event) => updateField("compare_at_price", event.target.value)}
                  placeholder="14999"
                />
              </label>

              <label className="text-xs text-white/65">
                Category *
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  required
                >
                  <option>Watches</option>
                  <option>Headphones</option>
                  <option>Audio</option>
                  <option>Earbuds</option>
                  <option>Speakers</option>
                  <option>Accessories</option>
                  <option>Bags</option>
                  <option>Perfume</option>
                  <option>Electronics</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="text-xs text-white/65">
                Stock quantity *
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateField("stock", event.target.value)}
                  required
                />
              </label>

              <label className="text-xs text-white/65 sm:col-span-2">
                Product tags (up to 5)
                <input
                  className={inputClass}
                  value={form.tags}
                  onChange={(event) => updateField("tags", event.target.value)}
                  placeholder="Best Seller, Sale, New Arrival"
                  maxLength={180}
                />
                <span className="mt-1 block text-[11px] text-white/40">
                  Separate tags with commas. Examples: Best Seller, Sale, New Arrival, Trending, Limited Edition.
                </span>
              </label>

              <div className="text-xs text-white/65 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="main-product-image-url">Main image URL (image 1 of up to 6)</label>
                  <Link
                    href="/admin/image-url-converter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#d4af37]/35 bg-[#d4af37]/[0.08] px-3 text-[11px] font-semibold text-[#e4c878] hover:bg-[#d4af37]/15"
                  >
                    <ExternalLink className="size-3.5" />
                    Convert Drive link
                  </Link>
                </div>
                <input
                  id="main-product-image-url"
                  className={inputClass}
                  type="url"
                  value={form.image_url}
                  onChange={(event) => updateField("image_url", event.target.value)}
                  placeholder="https://..."
                />
                <span className="mt-1 block text-[11px] text-white/40">
                  Use a publicly accessible image URL. Add up to 5 more image URLs below.
                </span>
              </div>

              <label className="text-xs text-white/65 sm:col-span-2">
                Additional product image URLs (one per line, up to 5)
                <textarea className={`${inputClass} min-h-24 resize-y`} value={form.additional_images} onChange={(event) => updateField("additional_images", event.target.value)} placeholder={"https://example.com/product-side.jpg\\nhttps://example.com/product-back.jpg"} />
              </label>

              <div className="text-xs text-white/65 sm:col-span-2">
                <label className="block">
                  Product video URLs (one per line, up to 2)
                  <textarea className={`${inputClass} min-h-20 resize-y`} value={form.videos} onChange={(event) => updateField("videos", event.target.value)} placeholder={"https://res.cloudinary.com/your-cloud/video/upload/sample.mp4"} />
                </label>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <label className="flex cursor-pointer flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium text-white/85"><UploadCloud className="size-4 text-[#d4af37]" />Upload a video to Cloudinary</span>
                      <span className="mt-1 block text-[11px] leading-5 text-white/45">MP4, WebM, or MOV · max 100 MB · up to 2 videos per product. Uploading does not publish it until you save the product.</span>
                    </span>
                    <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 px-4 text-xs text-[#e4c878]">{uploadingVideo ? "Uploading…" : "Choose video"}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      disabled={uploadingVideo || saving}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0]
                        event.currentTarget.value = ""
                        if (file) void uploadProductVideo(file)
                      }}
                    />
                  </label>
                  <p className="mt-2 text-[10px] leading-4 text-white/35">Requires an unsigned Cloudinary upload preset restricted to video uploads and a folder, plus NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variables.</p>
                </div>
              </div>

              {form.image_url && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs text-white/50">Image preview</p>
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    className="h-36 w-36 rounded-xl border border-white/10 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden"
                    }}
                  />
                </div>
              )}

              <label className="text-xs text-white/65 sm:col-span-2">
                Description
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Describe the product, its materials, features, and benefits..."
                  maxLength={5000}
                />
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                  className="size-4 accent-[#d4af37]"
                />
                <span>
                  <span className="block">Visible in catalogue</span>
                  <span className="mt-1 block text-xs text-white/45">
                    Turn this off to hide the product without deleting it.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="min-h-11 rounded-full border border-white/15 px-5 text-sm text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-full bg-[#d4af37] px-6 text-sm font-semibold text-[#17130c] hover:bg-[#e6c85c] disabled:cursor-wait disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium">Product catalogue</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-[#11110f] px-3 sm:w-64">
                <Search className="size-4 shrink-0 text-white/40" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, category or tag"
                  aria-label="Search products by name, category, or tag"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                />
              </label>
              <label className="flex min-h-10 items-center rounded-full border border-white/10 bg-[#11110f] px-3">
                <span className="sr-only">Filter by tag</span>
                <select
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                  aria-label="Filter products by tag"
                  className="max-w-36 bg-transparent text-xs text-white/75 outline-none"
                >
                  <option value="all" className="bg-[#11110f]">All tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag} className="bg-[#11110f]">{tag}</option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-10 items-center rounded-full border border-white/10 bg-[#11110f] px-3">
                <span className="sr-only">Filter product status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter products by stock and visibility"
                  className="max-w-36 bg-transparent text-xs text-white/75 outline-none"
                >
                  <option value="all" className="bg-[#11110f]">All status</option>
                  <option value="active" className="bg-[#11110f]">Active</option>
                  <option value="hidden" className="bg-[#11110f]">Hidden</option>
                  <option value="low-stock" className="bg-[#11110f]">Low stock</option>
                  <option value="out-of-stock" className="bg-[#11110f]">Out of stock</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void loadProducts()}
                disabled={loadingProducts}
                aria-label="Refresh products"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/65 hover:border-[#d4af37]/40 hover:text-[#e4c878] disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${loadingProducts ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            {loadingProducts && products.length === 0 ? (
              <p className="p-8 text-center text-sm text-white/50">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="mx-auto size-8 text-[#d4af37]/60" />
                <p className="mt-3 text-sm text-white/70">
                  {search || tagFilter !== "all" || statusFilter !== "all" ? "No products match these filters." : "No database products yet."}
                </p>
                {!search && tagFilter === "all" && statusFilter === "all" && (
                  <p className="mt-1 text-xs text-white/40">
                    Your existing sample products are still in the code. Add a database product here to begin.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#141411] text-xs text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="bg-[#0e0e0c] hover:bg-[#141411]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt=""
                                className="size-12 shrink-0 rounded-lg border border-white/10 object-cover"
                              />
                            ) : (
                              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/5">
                                <Package className="size-5 text-white/30" />
                              </div>
                            )}
                            <div className="max-w-64">
                              <p className="truncate font-medium">{product.name}</p>
                              <p className="mt-1 truncate text-xs text-white/40">
                                /{product.slug}
                              </p>
                              {product.tags?.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {product.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.08] px-2 py-0.5 text-[9px] text-[#e6d39c]">{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/65">{product.category}</td>
                        <td className="px-4 py-3 tabular-nums">
                          ₹{Number(product.price).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{product.stock}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] ${
                              product.is_active
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-white/10 text-white/50"
                            }`}
                          >
                            {product.is_active ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                              aria-label={`Edit ${product.name}`}
                              className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-[#d4af37]/10 hover:text-[#e4c878]"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleProduct(product)}
                              aria-label={product.is_active ? `Hide ${product.name}` : `Activate ${product.name}`}
                              className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-[#d4af37]/10 hover:text-[#e4c878]"
                            >
                              {product.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                            {(role === "admin" || role === "employee") && (<button
                              type="button"
                              onClick={() => void deleteProduct(product)}
                              aria-label={`Delete ${product.name}`}
                              className="grid size-9 place-items-center rounded-lg text-red-300/70 hover:bg-red-400/10 hover:text-red-300"
                            >
                              <Trash2 className="size-4" />
                            </button>)}

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] leading-5 text-white/35">
          Timora Admin · Product changes are stored in Supabase and drive the live storefront catalogue. Preview products are only shown when the database catalogue is empty or unavailable.
        </p>
      </div>
    </main>
  )
}
