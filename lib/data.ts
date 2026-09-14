export type ProductBadge = "NEW" | "SALE" | "BESTSELLER" | "TRENDING" | "LIMITED STOCK"

export type StockState = "in_stock" | "low_stock" | "out_of_stock"

export interface Variant {
  label: string
  value: string
}

export interface Review {
  id: string
  author: string
  rating: number
  title: string
  body: string
  date: string
  verified: boolean
  helpful: number
}

export interface Product {
  id: string
  slug: string
  brand: string
  name: string
  category: string
  categorySlug: string
  price: number
  mrp: number
  rating: number
  reviewCount: number
  image: string
  images: string[]
  badges: ProductBadge[]
  verified: boolean
  stock: StockState
  stockCount?: number
  deliveryBy: string
  freeDelivery: boolean
  returnDays: number
  colors: string[]
  highlights: string[]
  specs: { label: string; value: string }[]
  box: string[]
  warranty: string
  description: string
  reviews: Review[]
}

export interface Category {
  slug: string
  name: string
  productCount: number
  image: string
}

export const categories: Category[] = [
  { slug: "headphones", name: "Headphones", productCount: 128, image: "/timora/headphones.png" },
  { slug: "watches", name: "Watches", productCount: 86, image: "/timora/watch.png" },
  { slug: "laptops", name: "Laptops", productCount: 54, image: "/timora/laptop.png" },
  { slug: "earbuds", name: "Earbuds", productCount: 142, image: "/timora/earbuds.png" },
  { slug: "speakers", name: "Speakers", productCount: 73, image: "/timora/speaker.png" },
  { slug: "keyboards", name: "Keyboards", productCount: 61, image: "/timora/keyboard.png" },
]

const baseReviews: Review[] = [
  {
    id: "r1",
    author: "Aarav M.",
    rating: 5,
    title: "Excellent sound and comfort",
    body: "Battery easily lasts a full workweek and the noise cancellation is genuinely useful on flights.",
    date: "12 Aug 2026",
    verified: true,
    helpful: 42,
  },
  {
    id: "r2",
    author: "Priya S.",
    rating: 4,
    title: "Great, slightly tight fit",
    body: "Sound quality is superb. The clamp is a little firm for the first few days but loosens up.",
    date: "3 Aug 2026",
    verified: true,
    helpful: 18,
  },
  {
    id: "r3",
    author: "Rohan K.",
    rating: 5,
    title: "Genuine product, fast delivery",
    body: "Arrived sealed with a proper invoice. Registered the warranty without any issue.",
    date: "28 Jul 2026",
    verified: true,
    helpful: 9,
  },
]

export const products: Product[] = [
  {
    id: "p1",
    slug: "sony-wh-1000xm5",
    brand: "Sony",
    name: "WH-1000XM5 Wireless Noise-Cancelling Headphones",
    category: "Headphones",
    categorySlug: "headphones",
    price: 24999,
    mrp: 29999,
    rating: 4.7,
    reviewCount: 182,
    image: "/timora/headphones.png",
    images: ["/timora/headphones.png", "/timora/headphones.png", "/timora/headphones.png"],
    badges: ["BESTSELLER"],
    verified: true,
    stock: "in_stock",
    deliveryBy: "Wed, 17 Sep",
    freeDelivery: true,
    returnDays: 7,
    colors: ["Black", "Silver"],
    highlights: [
      "Industry-leading noise cancellation",
      "Up to 30 hours battery with quick charge",
      "Multipoint Bluetooth 5.3 connection",
      "Lightweight 250g design for all-day comfort",
    ],
    specs: [
      { label: "Battery", value: "30 hours" },
      { label: "Weight", value: "250 g" },
      { label: "Bluetooth", value: "5.3" },
      { label: "Charging", value: "USB-C" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Headphones", "Carrying case", "USB-C cable", "3.5mm audio cable", "Documentation"],
    warranty: "1 Year Manufacturer Warranty",
    description:
      "Reference-grade wireless headphones tuned for balanced sound and long listening sessions, with adaptive noise cancellation and comfortable memory-foam earcups.",
    reviews: baseReviews,
  },
  {
    id: "p2",
    slug: "timora-pulse-watch",
    brand: "Timora",
    name: "Pulse Smartwatch with AMOLED Display",
    category: "Watches",
    categorySlug: "watches",
    price: 8499,
    mrp: 11999,
    rating: 4.5,
    reviewCount: 96,
    image: "/timora/watch.png",
    images: ["/timora/watch.png", "/timora/watch.png"],
    badges: ["NEW", "TRENDING"],
    verified: true,
    stock: "low_stock",
    stockCount: 3,
    deliveryBy: "Tue, 16 Sep",
    freeDelivery: true,
    returnDays: 7,
    colors: ["Black", "Graphite"],
    highlights: [
      "1.4-inch AMOLED always-on display",
      "Heart rate and SpO2 tracking",
      "7-day battery life",
      "5 ATM water resistance",
    ],
    specs: [
      { label: "Display", value: "1.4\" AMOLED" },
      { label: "Battery", value: "7 days" },
      { label: "Water resistance", value: "5 ATM" },
      { label: "Connectivity", value: "Bluetooth 5.2" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Smartwatch", "Magnetic charger", "Extra strap", "Documentation"],
    warranty: "1 Year Manufacturer Warranty",
    description:
      "A lightweight everyday smartwatch with a bright AMOLED display, reliable health tracking and a genuinely week-long battery.",
    reviews: baseReviews.slice(0, 2),
  },
  {
    id: "p3",
    slug: "aero-book-14",
    brand: "Aero",
    name: "AeroBook 14 Ultralight Laptop (16GB / 512GB)",
    category: "Laptops",
    categorySlug: "laptops",
    price: 74999,
    mrp: 84999,
    rating: 4.6,
    reviewCount: 54,
    image: "/timora/laptop.png",
    images: ["/timora/laptop.png", "/timora/laptop.png"],
    badges: ["BESTSELLER"],
    verified: true,
    stock: "in_stock",
    deliveryBy: "Thu, 18 Sep",
    freeDelivery: true,
    returnDays: 7,
    colors: ["Silver", "Space Gray"],
    highlights: [
      "14-inch 2.8K display",
      "16GB RAM, 512GB SSD",
      "Up to 18 hours battery",
      "1.2kg all-metal chassis",
    ],
    specs: [
      { label: "Display", value: "14\" 2.8K" },
      { label: "RAM", value: "16 GB" },
      { label: "Storage", value: "512 GB SSD" },
      { label: "Battery", value: "18 hours" },
      { label: "Weight", value: "1.2 kg" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Laptop", "65W USB-C adapter", "Documentation"],
    warranty: "1 Year Onsite Warranty",
    description:
      "A thin-and-light productivity laptop with a sharp 2.8K display and all-day battery for work anywhere.",
    reviews: baseReviews.slice(0, 1),
  },
  {
    id: "p4",
    slug: "timora-air-buds",
    brand: "Timora",
    name: "AirBuds Pro Wireless Earbuds",
    category: "Earbuds",
    categorySlug: "earbuds",
    price: 4999,
    mrp: 6999,
    rating: 4.4,
    reviewCount: 210,
    image: "/timora/earbuds.png",
    images: ["/timora/earbuds.png", "/timora/earbuds.png"],
    badges: ["SALE", "TRENDING"],
    verified: true,
    stock: "in_stock",
    deliveryBy: "Tue, 16 Sep",
    freeDelivery: true,
    returnDays: 7,
    colors: ["White", "Black"],
    highlights: [
      "Active noise cancellation",
      "8 + 24 hours battery with case",
      "IPX4 sweat resistance",
      "Low-latency game mode",
    ],
    specs: [
      { label: "Battery", value: "8h + 24h case" },
      { label: "Water resistance", value: "IPX4" },
      { label: "Bluetooth", value: "5.3" },
      { label: "Charging", value: "USB-C" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Earbuds", "Charging case", "3 ear tip sizes", "USB-C cable", "Documentation"],
    warranty: "1 Year Manufacturer Warranty",
    description:
      "Compact ANC earbuds that fit securely for workouts, with a low-latency mode for gaming and clear calls.",
    reviews: baseReviews,
  },
  {
    id: "p5",
    slug: "timora-boom-speaker",
    brand: "Timora",
    name: "Boom Portable Bluetooth Speaker",
    category: "Speakers",
    categorySlug: "speakers",
    price: 3499,
    mrp: 4999,
    rating: 4.3,
    reviewCount: 74,
    image: "/timora/speaker.png",
    images: ["/timora/speaker.png"],
    badges: ["NEW"],
    verified: true,
    stock: "in_stock",
    deliveryBy: "Wed, 17 Sep",
    freeDelivery: true,
    returnDays: 7,
    colors: ["Charcoal", "Sand"],
    highlights: [
      "360° room-filling sound",
      "12 hours playtime",
      "IP67 waterproof and dustproof",
      "Pair two for stereo",
    ],
    specs: [
      { label: "Battery", value: "12 hours" },
      { label: "Water resistance", value: "IP67" },
      { label: "Bluetooth", value: "5.1" },
      { label: "Charging", value: "USB-C" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Speaker", "USB-C cable", "Wrist strap", "Documentation"],
    warranty: "1 Year Manufacturer Warranty",
    description:
      "A rugged, waterproof speaker with surprisingly big 360° sound and enough battery for a full day out.",
    reviews: baseReviews.slice(1, 3),
  },
  {
    id: "p6",
    slug: "timora-type-keyboard",
    brand: "Timora",
    name: "Type75 Wireless Mechanical Keyboard",
    category: "Keyboards",
    categorySlug: "keyboards",
    price: 6499,
    mrp: 7999,
    rating: 4.6,
    reviewCount: 38,
    image: "/timora/keyboard.png",
    images: ["/timora/keyboard.png"],
    badges: ["LIMITED STOCK"],
    verified: true,
    stock: "low_stock",
    stockCount: 5,
    deliveryBy: "Thu, 18 Sep",
    freeDelivery: false,
    returnDays: 7,
    colors: ["White", "Gray"],
    highlights: [
      "75% hot-swappable layout",
      "Gasket-mounted for a soft typing feel",
      "Tri-mode: USB-C, Bluetooth, 2.4GHz",
      "Up to 200 hours battery",
    ],
    specs: [
      { label: "Layout", value: "75%" },
      { label: "Switches", value: "Hot-swappable" },
      { label: "Battery", value: "200 hours" },
      { label: "Connectivity", value: "USB-C / BT / 2.4GHz" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Keyboard", "USB-C cable", "2.4GHz dongle", "Keycap puller", "Documentation"],
    warranty: "1 Year Manufacturer Warranty",
    description:
      "A premium gasket-mounted mechanical keyboard with hot-swap switches and flexible tri-mode connectivity.",
    reviews: baseReviews.slice(0, 2),
  },
  {
    id: "p7",
    slug: "sony-street-headphones",
    brand: "Sony",
    name: "Street On-Ear Wireless Headphones",
    category: "Headphones",
    categorySlug: "headphones",
    price: 6999,
    mrp: 9999,
    rating: 4.2,
    reviewCount: 63,
    image: "/timora/headphones.png",
    images: ["/timora/headphones.png"],
    badges: ["SALE"],
    verified: true,
    stock: "in_stock",
    deliveryBy: "Wed, 17 Sep",
    freeDelivery: true,
    returnDays: 7,
    colors: ["Black"],
    highlights: [
      "Punchy bass tuning",
      "35 hours battery",
      "Foldable travel design",
      "Fast USB-C charging",
    ],
    specs: [
      { label: "Battery", value: "35 hours" },
      { label: "Weight", value: "180 g" },
      { label: "Bluetooth", value: "5.2" },
      { label: "Charging", value: "USB-C" },
      { label: "Warranty", value: "1 year" },
    ],
    box: ["Headphones", "USB-C cable", "Documentation"],
    warranty: "1 Year Manufacturer Warranty",
    description:
      "Affordable on-ear wireless headphones with bass-forward sound and a foldable design for commuting.",
    reviews: baseReviews.slice(0, 1),
  },
  {
    id: "p8",
    slug: "timora-studio-buds",
    brand: "Timora",
    name: "Studio Buds Wired Earphones",
    category: "Earbuds",
    categorySlug: "earbuds",
    price: 1299,
    mrp: 1999,
    rating: 4.1,
    reviewCount: 156,
    image: "/timora/earbuds.png",
    images: ["/timora/earbuds.png"],
    badges: [],
    verified: true,
    stock: "out_of_stock",
    deliveryBy: "—",
    freeDelivery: false,
    returnDays: 7,
    colors: ["Black"],
    highlights: [
      "Balanced tuning with clear vocals",
      "In-line mic and controls",
      "Tangle-resistant cable",
      "3.5mm connector",
    ],
    specs: [
      { label: "Driver", value: "10 mm" },
      { label: "Connector", value: "3.5 mm" },
      { label: "Mic", value: "In-line" },
      { label: "Warranty", value: "6 months" },
    ],
    box: ["Earphones", "3 ear tip sizes", "Documentation"],
    warranty: "6 Month Manufacturer Warranty",
    description:
      "Simple, reliable wired earphones with a clean, balanced sound signature and an in-line mic.",
    reviews: baseReviews.slice(2, 3),
  },
]

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductsByCategory(slug: string): Product[] {
  return products.filter((p) => p.categorySlug === slug)
}

export const brands = Array.from(new Set(products.map((p) => p.brand))).sort()

export interface Coupon {
  code: string
  description: string
  discount: number
  minOrder: number
}

export const coupons: Coupon[] = [
  { code: "TIMORA500", description: "₹500 off on orders above ₹4,999", discount: 500, minOrder: 4999 },
  { code: "FIRST10", description: "10% off your first order", discount: 0, minOrder: 999 },
]
