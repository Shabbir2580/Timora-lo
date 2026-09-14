import Link from "next/link"
import { ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react"

const columns = [
  {
    title: "Shop",
    links: ["Headphones", "Watches", "Laptops", "Earbuds", "Speakers", "Keyboards"],
  },
  {
    title: "Help",
    links: ["Help Center", "Track Order", "Returns & Refunds", "Shipping", "Contact Us"],
  },
  {
    title: "Company",
    links: ["About Timora", "Careers", "Terms of Use", "Privacy Policy", "Sell with Timora"],
  },
]

const assurances = [
  { icon: ShieldCheck, label: "100% Authentic" },
  { icon: Truck, label: "Clear Delivery" },
  { icon: RotateCcw, label: "Easy Returns" },
  { icon: Lock, label: "Secure Payments" },
]

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-foreground">TIMORA</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Better products. Better prices. Authentic electronics with genuine invoices and easy
              returns.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {assurances.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {label}
                </div>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 Timora Retail Pvt. Ltd. All rights reserved.</p>
          <p>Prices include GST · Genuine invoice with every order</p>
        </div>
      </div>
    </footer>
  )
}
