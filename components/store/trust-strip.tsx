import { ShieldCheck, Truck, RotateCcw, Lock, ReceiptText } from "lucide-react"

const items = [
  { icon: ShieldCheck, label: "Timora Verified", sub: "Authentic products" },
  { icon: Truck, label: "Clear Delivery", sub: "Know your date" },
  { icon: RotateCcw, label: "Easy Returns", sub: "7-day window" },
  { icon: Lock, label: "Secure Payments", sub: "Encrypted checkout" },
  { icon: ReceiptText, label: "Genuine Invoice", sub: "GST billing" },
]

export function TrustStrip() {
  return (
    <div className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-4">
            <Icon className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
